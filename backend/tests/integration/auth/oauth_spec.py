import pytest
from httpx import AsyncClient
from sqlalchemy import select
from src.main import app
from src.modules.users.models import User, SocialAccount

@pytest.mark.asyncio
async def test_oauth2_authorization(db_session):
    
    code = "auth_code_123"
    provider = "google"

    from src.modules.auth.services.oauth import process_oauth_callback
    
    token_response = await process_oauth_callback(provider, code)
    assert token_response.access_token is not None

    stmt = select(User).join(SocialAccount).where(SocialAccount.provider_account_id == f"id_{code}")
    result = await db_session.execute(stmt)
    user = result.scalar_one()

    assert user.email == f"user_{code}@{provider}.com"
    assert user.is_email_verified is True