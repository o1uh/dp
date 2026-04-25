from typing import List, Optional
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.db.session import get_session
from src.core.security import decode_token
from src.core.exceptions import AccessDeniedError
from src.modules.users.models import User
from src.modules.users.repositories import UserRepository
from src.modules.rbac.repositories import RoleRepository

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AccessDeniedError("Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise AccessDeniedError(str(e))
    
    user_id = payload.get("sub")
    if not user_id:
        raise AccessDeniedError("Invalid token payload")
        
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)
    if not user or not user.is_active or user.deleted_at:
        raise AccessDeniedError("User not found or inactive")
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
    ) -> User:
        if not user.role_id:
            raise AccessDeniedError("User has no role")
            
        repo = RoleRepository(session)
        role = await repo.get_by_id(str(user.role_id))
        
        if not role or role.name not in self.allowed_roles:
            raise AccessDeniedError("Insufficient permissions")
            
        return user