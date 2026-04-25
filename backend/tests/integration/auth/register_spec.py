import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from src.main import app
from src.modules.users.models import User

@pytest.mark.asyncio
async def test_email_verification_flag(db_session):
    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "Password123"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/auth/register", json=payload)
        assert response.status_code == 201

        stmt = select(User).where(User.email == payload["email"])
        result = await db_session.execute(stmt)
        user = result.scalar_one()
        
        # по умолчанию email не верифицирован, пароль захеширован
        assert user.is_email_verified is False
        assert user.password_hash != payload["password"]