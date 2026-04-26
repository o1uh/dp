from datetime import datetime
from src.infrastructure.db.uow import UnitOfWork
from src.core.security import create_access_token, create_refresh_token
from src.modules.users.models import User, SocialAccount
from src.modules.users.repositories import UserRepository
from src.modules.auth.repositories import AuthRepository
from src.modules.auth.models import RefreshToken
from src.modules.rbac.repositories import RoleRepository
from src.modules.auth.schemas import TokenResponse

async def process_oauth_callback(provider: str, code: str) -> TokenResponse:
    # мок интеграции с внешними провайдерами для B2C
    # в будущем здесь HTTP-запрос к Google/VK за профилем
    mock_email = f"user_{code}@{provider}.com"
    mock_username = f"{provider}_user_{code}"
    mock_account_id = f"id_{code}"

    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)
        role_repo = RoleRepository(uow.session)

        user = await user_repo.get_by_email(mock_email)
        
        if not user:
            default_role = await role_repo.get_by_name("b2c_user")
            user = User(
                username=mock_username,
                email=mock_email,
                password_hash="oauth_no_password",
                is_email_verified=True,
                role_id=default_role.id if default_role else None
            )
            user_repo.add(user)
            await uow.session.flush()

            social_account = SocialAccount(
                user_id=user.id,
                provider_name=provider,
                provider_account_id=mock_account_id
            )
            uow.session.add(social_account)

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