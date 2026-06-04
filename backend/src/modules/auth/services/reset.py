import uuid
from datetime import datetime, timedelta
from src.infrastructure.db.uow import UnitOfWork
from src.infrastructure.mail.smtp import send_reset_password_email
from src.core.security import hash_password
from src.core.exceptions import BusinessRuleError
from src.modules.users.repositories import UserRepository
from src.modules.auth.repositories import AuthRepository
from src.modules.auth.models import PasswordResetToken
from src.core.logger import logger

async def initiate_password_reset(email: str) -> None:
    logger.info(f"Request received to initiate password reset for email: {email}")
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)

        # logger.info(f"Checking if user exists for email: {email}")
        user = await user_repo.get_by_email(email)
        if not user:
            # имитация успешного выполнения
            # для временного обхода перебора email
            logger.warning(f"Password reset request ignored: No user exists with email: {email}")
            return

        token_str = str(uuid.uuid4())
        expiry_time = datetime.utcnow() + timedelta(hours=1)
        # logger.info(f"Generating password reset token: {token_str} with expiry: {expiry_time} for User: {user.id}")

        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token_str,
            expires_at=expiry_time
        )
        # logger.info(f"Saving reset token to repository for User: {user.id}")
        auth_repo.add_reset_token(reset_token)

        # logger.info("Committing transaction to finalize reset request...")
        await uow.commit()
        # logger.info(f"Transaction finalized. Dispatching email to: {email}")

        await send_reset_password_email(email, token_str)
        # logger.info(f"Email containing reset token sent to {email}")

async def confirm_password_reset(token: str, new_password: str) -> None:
    # logger.info(f"Confirming password reset with token: {token}")
    async with UnitOfWork() as uow:
        auth_repo = AuthRepository(uow.session)
        user_repo = UserRepository(uow.session)

        # logger.info(f"Retrieving validation data for token: {token}")
        token_record = await auth_repo.get_reset_token(token)
        if not token_record:
            logger.warning(f"Reset confirmation rejected: Token {token} does not exist")
            raise BusinessRuleError("Invalid or expired reset token")

        # logger.info(f"Validating token properties. Used: {token_record.is_used}, Expiration: {token_record.expires_at}, Current Time: {datetime.utcnow()}")
        if token_record.is_used or token_record.expires_at < datetime.utcnow():
            logger.warning(f"Reset confirmation rejected: Token {token} is either expired or already consumed")
            raise BusinessRuleError("Invalid or expired reset token")

        # logger.info(f"Marking reset token ID {token_record.id} as used")
        token_record.is_used = True

        # logger.info(f"Retrieving user record ID {token_record.user_id} to apply new credentials")
        user = await user_repo.get_by_id(str(token_record.user_id))
        if user:
            # logger.info(f"Hashing new password and updating credentials for User: {user.id}")
            user.password_hash = await hash_password(new_password)

            # logger.info(f"Invalidating all previous active sessions / revoking tokens for User ID: {user.id}")
            await auth_repo.revoke_all_user_tokens(str(user.id))
        else:
            logger.error(f"Integrity warning: Token validated but associated User ID {token_record.user_id} not found in DB")

        # logger.info("Committing credential updates...")
        await uow.commit()
        # logger.info(f"Password update successfully completed and committed for User ID: {token_record.user_id}")