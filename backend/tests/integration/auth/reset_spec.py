import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from sqlalchemy import select
from src.main import app
from src.modules.auth.models import PasswordResetToken

@pytest.mark.asyncio
async def test_password_reset_flow(db_session, setup_auth_user):
    _, user_id = setup_auth_user
    email = "authuser@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        
        with patch("src.modules.auth.services.reset.send_reset_password_email") as mock_email:
            resp1 = await client.post("/api/auth/forgot-password", json={"email": email})
            assert resp1.status_code == 202
            mock_email.assert_called_once()

        stmt = select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
        result = await db_session.execute(stmt)
        token_record = result.scalars().first()
        assert token_record is not None
        assert token_record.is_used is False

        resp2 = await client.post(
            "/api/auth/reset-password", 
            json={"token": token_record.token, "new_password": "new_strong_password"}
        )
        assert resp2.status_code == 200

        await db_session.refresh(token_record)
        assert token_record.is_used is True