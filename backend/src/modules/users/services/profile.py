from datetime import datetime, timedelta
from src.infrastructure.db.uow import UnitOfWork
from src.core.security import hash_password, verify_password
from src.core.exceptions import BusinessRuleError, NotFoundError
from src.modules.users.models import User
from src.modules.users.repositories import UserRepository
from src.modules.rbac.repositories import RoleRepository
from src.modules.auth.repositories import AuthRepository
from src.modules.users.schemas import UserCreateRequest, ProfileUpdateRequest, ChangePasswordRequest
from src.modules.billing.models import UserQuotaCurrent

async def register_user(data: UserCreateRequest) -> None:
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        email_str = str(data.email)
        
        if await user_repo.get_by_email(email_str):
            raise BusinessRuleError("Email already in use")
        if await user_repo.get_by_username(data.username):
            raise BusinessRuleError("Username already in use")

        role_repo = RoleRepository(uow.session)
        default_role = await role_repo.get_by_name("b2c_user")

        new_user = User(
            username=data.username,
            email=email_str,
            password_hash=hash_password(data.password),
            role_id=default_role.id if default_role else None,
            is_active=True,
            is_email_verified=False
        )
        user_repo.add(new_user)
        await uow.session.flush()

        # временная инициализация бесконечной квоты (-1 ТБ использовано, срок 100 лет)
        infinite_quota = UserQuotaCurrent(
            user_id=new_user.id,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=36500),
            storage_used_bytes=-1000000000000,
            duration_used_sec=-10000000.0
        )
        uow.session.add(infinite_quota)
        
        await uow.commit()

async def update_user_profile(user_id: str, data: ProfileUpdateRequest) -> None:
    async with UnitOfWork() as uow:
        repo = UserRepository(uow.session)
        user = await repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        if data.bio is not None:
            user.bio = data.bio
        if data.profile_specialization is not None:
            user.profile_specialization = data.profile_specialization
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url
            
        await uow.commit()

async def change_user_password(user_id: str, data: ChangePasswordRequest) -> None:
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)
        
        user = await user_repo.get_by_id(user_id)
        if not user or not verify_password(data.old_password, user.password_hash):
            raise BusinessRuleError("Invalid old password")

        user.password_hash = hash_password(data.new_password)
        await auth_repo.revoke_all_user_tokens(user_id)
        await uow.commit()

async def soft_delete_user(user_id: str) -> None:
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)
        
        user = await user_repo.get_by_id(user_id)
        if user:
            user.deleted_at = datetime.utcnow()
            user.is_active = False
            await auth_repo.revoke_all_user_tokens(user_id)
            await uow.commit()