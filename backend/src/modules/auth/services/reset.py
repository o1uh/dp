import uuid
from datetime import datetime, timedelta
from src.infrastructure.db.uow import UnitOfWork
from src.infrastructure.mail.smtp import send_reset_password_email
from src.core.security import hash_password
from src.core.exceptions import BusinessRuleError
from src.modules.users.repositories import UserRepository
from src.modules.auth.repositories import AuthRepository
from src.modules.auth.models import PasswordResetToken

async def initiate_password_reset(email: str) -> None:
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)

        user = await user_repo.get_by_email(email)
        if not user:
            # имитация успешного выполнения 
            # для временного обхода перебора email
            return  

        token_str = str(uuid.uuid4())
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token_str,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        auth_repo.add_reset_token(reset_token)
        await uow.commit()

        await send_reset_password_email(email, token_str)

async def confirm_password_reset(token: str, new_password: str) -> None:
    async with UnitOfWork() as uow:
        auth_repo = AuthRepository(uow.session)
        user_repo = UserRepository(uow.session)

        token_record = await auth_repo.get_reset_token(token)
        if not token_record or token_record.is_used or token_record.expires_at < datetime.utcnow():
            raise BusinessRuleError("Invalid or expired reset token")

        token_record.is_used = True
        
        user = await user_repo.get_by_id(str(token_record.user_id))
        if user:
            user.password_hash = hash_password(new_password)
            await auth_repo.revoke_all_user_tokens(str(user.id))
            
        await uow.commit()