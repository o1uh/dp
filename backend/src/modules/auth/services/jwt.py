from datetime import datetime
from src.infrastructure.db.uow import UnitOfWork
from src.core.security import verify_password, create_access_token, create_refresh_token
from src.core.exceptions import AccessDeniedError, BusinessRuleError
from src.modules.users.repositories import UserRepository
from src.modules.auth.repositories import AuthRepository
from src.modules.auth.models import RefreshToken
from src.modules.auth.schemas import LoginRequest, TokenResponse
from src.core.logger import logger

async def authenticate_user(data: LoginRequest) -> TokenResponse:
    logger.info(f"Starting authentication process for user email: {data.email}")
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)

        logger.info(f"Querying database for user record by email: {data.email}")
        user = await user_repo.get_by_email(data.email)
        if not user:
            logger.warning(f"Authentication failed: User with email {data.email} not found in database")
            raise AccessDeniedError("Invalid email or password")

        logger.info(f"Verifying password for user ID: {user.id}")
        if not verify_password(data.password, user.password_hash):
            logger.warning(f"Authentication failed: Password mismatch for user ID: {user.id}")
            raise AccessDeniedError("Invalid email or password")

        logger.info(f"Password verified. Generating tokens for User ID: {user.id}, Role: {user.role_id}")
        access_token = create_access_token(user.id, user.role_id)
        refresh_token_str = create_refresh_token(user.id)

        from src.core.security import decode_token
        logger.info("Decoding generated refresh token to extract expiration date")
        payload = decode_token(refresh_token_str)
        expires_at_dt = datetime.utcfromtimestamp(payload["exp"])
        logger.info(f"Refresh token expires at: {expires_at_dt}")
        
        refresh_obj = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=expires_at_dt
        )
        logger.info(f"Adding new refresh token to repository for User ID: {user.id}")
        auth_repo.add_refresh_token(refresh_obj)
        
        logger.info("Committing transaction...")
        await uow.commit()
        logger.info(f"Authentication transaction committed successfully for User ID: {user.id}")

        return TokenResponse(access_token=access_token, refresh_token=refresh_token_str)

async def refresh_user_token(old_refresh_token: str) -> TokenResponse:
    logger.info("Attempting to rotate token using refresh token")
    async with UnitOfWork() as uow:
        auth_repo = AuthRepository(uow.session)
        user_repo = UserRepository(uow.session)

        logger.info("Retrieving refresh token record from database")
        token_record = await auth_repo.get_refresh_token(old_refresh_token)
        if not token_record:
            logger.warning("Token rotation failed: Refresh token not found in database")
            raise AccessDeniedError("Invalid or expired refresh token")

        logger.info(f"Validating refresh token record for User: {token_record.user_id}. Revoked status: {token_record.is_revoked}, Expiry: {token_record.expires_at}")
        if token_record.is_revoked or token_record.expires_at < datetime.utcnow():
            logger.warning(f"Token rotation failed: Token is revoked or expired for User: {token_record.user_id}")
            raise AccessDeniedError("Invalid or expired refresh token")

        logger.info(f"Revoking old refresh token ID: {token_record.id}")
        token_record.is_revoked = True

        logger.info(f"Retrieving active user record by ID: {token_record.user_id}")
        user = await user_repo.get_by_id(str(token_record.user_id))
        if not user or not user.is_active:
            logger.warning(f"Token rotation failed: User record is inactive or missing for ID: {token_record.user_id}")
            raise AccessDeniedError("User inactive or deleted")

        logger.info(f"Generating new tokens for User ID: {user.id}, Role: {user.role_id}")
        access_token = create_access_token(user.id, user.role_id)
        new_refresh_str = create_refresh_token(user.id)
        
        from src.core.security import decode_token
        logger.info("Decoding new refresh token payload to retrieve parameters")
        payload = decode_token(new_refresh_str)
        new_expires_at = datetime.utcfromtimestamp(payload["exp"])
        logger.info(f"New refresh token expiration: {new_expires_at}")

        new_refresh_obj = RefreshToken(
            user_id=user.id,
            token=new_refresh_str,
            expires_at=new_expires_at
        )
        logger.info(f"Persisting new refresh token record for User ID: {user.id}")
        auth_repo.add_refresh_token(new_refresh_obj)
        
        logger.info("Committing token rotation transaction...")
        await uow.commit()
        logger.info(f"Token rotation transaction committed successfully for User ID: {user.id}")

        return TokenResponse(access_token=access_token, refresh_token=new_refresh_str)

async def logout_user(refresh_token: str) -> None:
    logger.info("Initiating user logout flow...")
    async with UnitOfWork() as uow:
        auth_repo = AuthRepository(uow.session)
        logger.info("Retrieving refresh token to invalidate during logout")
        token_record = await auth_repo.get_refresh_token(refresh_token)
        if token_record and not token_record.is_revoked:
            logger.info(f"Revoking refresh token ID: {token_record.id} for User ID: {token_record.user_id}")
            token_record.is_revoked = True
            await uow.commit()
            logger.info(f"Logout transaction committed. Token revoked for User ID: {token_record.user_id}")
        else:
            logger.warning("Logout invoked with already revoked or non-existent refresh token")