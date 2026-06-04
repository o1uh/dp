from typing import List, Optional
from fastapi import Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.db.session import get_session
from src.core.security import decode_token
from src.core.exceptions import AccessDeniedError
from src.modules.users.models import User
from src.modules.users.repositories import UserRepository
from src.modules.rbac.repositories import RoleRepository
from src.core.logger import logger

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> User:
    # logger.info(f"Extracting user session from incoming request context. Path: {request.url.path}")
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        logger.warning("Authentication failed: Missing Authorization header in request context")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    if not auth_header.startswith("Bearer "):
        logger.warning(f"Authentication failed: Invalid header schema layout '{auth_header[:15]}...'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = auth_header.split(" ")[1]
    # logger.info("Decoding authorization Bearer token...")
    try:
        payload = decode_token(token)
    except ValueError as e:
        logger.warning(f"Authentication failed during signature decoding: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    user_id = payload.get("sub")
    # logger.info(f"Token decoded. Asserting claims for Subject ID: {user_id}")
    if not user_id:
        logger.warning("Authentication failed: Subject claim 'sub' is empty inside token payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    repo = UserRepository(session)
    # logger.info(f"Retrieving active user structure from database using Subject ID: {user_id}")
    user = await repo.get_by_id(user_id)
    if not user:
        logger.warning(f"Authentication failed: User ID {user_id} does not exist or has been logically deleted")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    if not user.is_active:
        logger.warning(f"Authentication failed: User ID {user_id} has inactive status in system")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    if user.deleted_at:
        logger.warning(f"Authentication failed: User ID {user_id} has soft-delete timestamp assigned: {user.deleted_at}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
    ) -> User:
        # logger.info(f"Authorizing client permissions. User: {user.id}. Allowed Roles list: {self.allowed_roles}")
        if not user.role_id:
            logger.warning(f"Authorization failed: User ID {user.id} has no assigned role reference")
            raise AccessDeniedError("User has no role")

        repo = RoleRepository(session)
        # logger.info(f"Retrieving role definition metadata using Identifier: {user.role_id}")
        role = await repo.get_by_id(str(user.role_id))

        if not role:
            logger.warning(f"Authorization failed: DB schema violation, role template ID {user.role_id} missing from lookup tables")
            raise AccessDeniedError("Insufficient permissions")

        # logger.info(f"Extracted role catalog metrics - User: {user.id}, Role Name: '{role.name}'")
        if role.name not in self.allowed_roles:
            logger.warning(f"Authorization failed: Role match failed. Role '{role.name}' is not in permitted list {self.allowed_roles} for User: {user.id}")
            raise AccessDeniedError("Insufficient permissions")

        return user