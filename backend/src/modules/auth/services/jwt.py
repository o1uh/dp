from datetime import datetime
from src.infrastructure.db.uow import UnitOfWork
from src.core.security import verify_password, create_access_token, create_refresh_token
from src.core.exceptions import AccessDeniedError, BusinessRuleError
from src.modules.users.repositories import UserRepository
from src.modules.auth.repositories import AuthRepository
from src.modules.auth.models import RefreshToken
from src.modules.auth.schemas import LoginRequest, TokenResponse

async def authenticate_user(data: LoginRequest) -> TokenResponse:
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)

        user = await user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise AccessDeniedError("Invalid email or password")

        access_token = create_access_token(user.id, user.role_id)
        refresh_token_str = create_refresh_token(user.id)

        from src.core.security import decode_token
        payload = decode_token(refresh_token_str)
        
        refresh_obj = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.utcfromtimestamp(payload["exp"])
        )
        auth_repo.add_refresh_token(refresh_obj)
        await uow.commit()

        return TokenResponse(access_token=access_token, refresh_token=refresh_token_str)

async def refresh_user_token(old_refresh_token: str) -> TokenResponse:
    async with UnitOfWork() as uow:
        auth_repo = AuthRepository(uow.session)
        user_repo = UserRepository(uow.session)

        token_record = await auth_repo.get_refresh_token(old_refresh_token)
        if not token_record or token_record.is_revoked or token_record.expires_at < datetime.utcnow():
            raise AccessDeniedError("Invalid or expired refresh token")

        token_record.is_revoked = True

        user = await user_repo.get_by_id(str(token_record.user_id))
        if not user or not user.is_active:
            raise AccessDeniedError("User inactive or deleted")

        access_token = create_access_token(user.id, user.role_id)
        new_refresh_str = create_refresh_token(user.id)
        
        from src.core.security import decode_token
        payload = decode_token(new_refresh_str)

        new_refresh_obj = RefreshToken(
            user_id=user.id,
            token=new_refresh_str,
            expires_at=datetime.utcfromtimestamp(payload["exp"])
        )
        auth_repo.add_refresh_token(new_refresh_obj)
        await uow.commit()

        return TokenResponse(access_token=access_token, refresh_token=new_refresh_str)

async def logout_user(refresh_token: str) -> None:
    async with UnitOfWork() as uow:
        auth_repo = AuthRepository(uow.session)
        token_record = await auth_repo.get_refresh_token(refresh_token)
        if token_record and not token_record.is_revoked:
            token_record.is_revoked = True
            await uow.commit()