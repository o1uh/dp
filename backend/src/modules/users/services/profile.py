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
from src.core.logger import logger

async def register_user(data: UserCreateRequest) -> None:
    email_str = str(data.email)
    logger.info(f"Initiating user registration for username: '{data.username}', email: '{email_str}'")
    
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        
        logger.info(f"Validating user registration. Checking availability of email: '{email_str}'")
        if await user_repo.get_by_email(email_str):
            logger.warning(f"Registration aborted: Email '{email_str}' is already occupied")
            raise BusinessRuleError("Email already in use")
            
        logger.info(f"Validating user registration. Checking availability of username: '{data.username}'")
        if await user_repo.get_by_username(data.username):
            logger.warning(f"Registration aborted: Username '{data.username}' is already occupied")
            raise BusinessRuleError("Username already in use")

        role_repo = RoleRepository(uow.session)
        logger.info("Fetching default user role 'b2c_user' for new registrant")
        default_role = await role_repo.get_by_name("b2c_user")
        if not default_role:
            logger.warning("Default role 'b2c_user' not found in database. User will be registered without a role relationship")

        logger.info(f"Creating new User model. Hashing password...")
        new_user = User(
            username=data.username,
            email=email_str,
            password_hash=hash_password(data.password),
            role_id=default_role.id if default_role else None,
            is_active=True,
            is_email_verified=False
        )
        user_repo.add(new_user)
        
        logger.info("Flushing session to generate database identifiers...")
        await uow.session.flush()
        logger.info(f"User model generated with ID: {new_user.id}")

        quota_duration = timedelta(days=36500)
        quota_end = datetime.utcnow() + quota_duration
        logger.info(f"Allocating infinite trial quota for User ID: {new_user.id}. End date: {quota_end}")
        
        infinite_quota = UserQuotaCurrent(
            user_id=new_user.id,
            period_start=datetime.utcnow(),
            period_end=quota_end,
            storage_used_bytes=-1000000000000,
            duration_used_sec=-10000000.0
        )
        uow.session.add(infinite_quota)
        
        logger.info("Committing registration transaction...")
        await uow.commit()
        logger.info(f"Registration successfully finished and committed for User: {new_user.id}")

async def update_user_profile(user_id: str, data: ProfileUpdateRequest) -> None:
    logger.info(f"Starting profile metadata update for User ID: {user_id}")
    async with UnitOfWork() as uow:
        repo = UserRepository(uow.session)
        
        logger.info(f"Retrieving current profile record for User: {user_id}")
        user = await repo.get_by_id(user_id)
        if not user:
            logger.error(f"Profile update failed: User with ID {user_id} was not found")
            raise NotFoundError("User not found")
        
        logger.info(f"Applying profile payload. Bio update: {data.bio is not None}, Specialization update: {data.profile_specialization is not None}, Avatar update: {data.avatar_url is not None}")
        if data.bio is not None:
            user.bio = data.bio
        if data.profile_specialization is not None:
            user.profile_specialization = data.profile_specialization
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url
            
        logger.info("Committing profile updates...")
        await uow.commit()
        logger.info(f"Profile changes saved successfully for User ID: {user_id}")

async def change_user_password(user_id: str, data: ChangePasswordRequest) -> None:
    logger.info(f"Starting credential modification flow for User ID: {user_id}")
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)
        
        logger.info(f"Retrieving credentials record to mutate for User: {user_id}")
        user = await user_repo.get_by_id(user_id)
        if not user:
            logger.error(f"Credential update aborted: User ID {user_id} not found")
            raise BusinessRuleError("Invalid old password")

        logger.info("Verifying current password validity")
        if not verify_password(data.old_password, user.password_hash):
            logger.warning(f"Credential update aborted: Password validation failed for User: {user_id}")
            raise BusinessRuleError("Invalid old password")

        logger.info(f"Applying password changes. Encrypting new password...")
        user.password_hash = hash_password(data.new_password)
        
        logger.info(f"Forcing revocation of all active session tokens for User: {user_id}")
        await auth_repo.revoke_all_user_tokens(user_id)
        
        logger.info("Committing password updates...")
        await uow.commit()
        logger.info(f"Credential modification completed and committed for User ID: {user_id}")

async def soft_delete_user(user_id: str) -> None:
    logger.info(f"Soft delete command received for User ID: {user_id}")
    async with UnitOfWork() as uow:
        user_repo = UserRepository(uow.session)
        auth_repo = AuthRepository(uow.session)
        
        logger.info(f"Retrieving active user entity to terminate for User: {user_id}")
        user = await user_repo.get_by_id(user_id)
        if user:
            logger.info(f"Applying soft deletion marks to User: {user_id}")
            user.deleted_at = datetime.utcnow()
            user.is_active = False
            
            logger.info(f"Revoking all active authentication tokens for User ID: {user_id}")
            await auth_repo.revoke_all_user_tokens(user_id)
            
            logger.info("Committing logical deletion status...")
            await uow.commit()
            logger.info(f"User profile with ID {user_id} logically deleted from system")
        else:
            logger.warning(f"Logical deletion ignored: No active User ID {user_id} found")