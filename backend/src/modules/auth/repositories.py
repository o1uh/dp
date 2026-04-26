from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.auth.models import RefreshToken, PasswordResetToken

class AuthRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        stmt = select(RefreshToken).where(RefreshToken.token == token)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add_refresh_token(self, token_obj: RefreshToken) -> None:
        self.session.add(token_obj)

    async def revoke_all_user_tokens(self, user_id: str) -> None:
        stmt = update(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        ).values(is_revoked=True)
        await self.session.execute(stmt)

    def add_reset_token(self, token_obj: PasswordResetToken) -> None:
        self.session.add(token_obj)

    async def get_reset_token(self, token: str) -> Optional[PasswordResetToken]:
        stmt = select(PasswordResetToken).where(PasswordResetToken.token == token)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()