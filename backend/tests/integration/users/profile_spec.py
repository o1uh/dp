import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from src.main import app
from src.modules.users.models import User
from src.modules.auth.models import RefreshToken

@pytest.mark.asyncio
async def test_soft_delete_user_profile(db_session, setup_auth_user):
    token, user_id = setup_auth_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 204

        stmt = select(User).where(User.id == user_id)
        result = await db_session.execute(stmt)
        user = result.scalar_one()
        assert user.deleted_at is not None
        assert user.is_active is False

        stmt_tokens = select(RefreshToken).where(RefreshToken.user_id == user_id)
        tokens_result = await db_session.execute(stmt_tokens)
        for t in tokens_result.scalars():
            assert t.is_revoked is True