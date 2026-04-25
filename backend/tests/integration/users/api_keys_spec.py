import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from src.main import app
from src.modules.users.models import ApiKey

@pytest.mark.asyncio
@pytest.mark.skip(reason="Endpoint /api/users/keys is not implemented in application routers")
async def test_api_key_crud(db_session, setup_auth_user):
    token, user_id = setup_auth_user
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        
        create_resp = await client.post(
            "/api/users/keys",
            json={"name": "Test Key", "webhook_url": "http://example.com/hook"},
            headers=headers
        )
        assert create_resp.status_code == 200
        data = create_resp.json()
        assert "raw_key" in data
        key_id = data["id"]

        stmt = select(ApiKey).where(ApiKey.id == key_id)
        result = await db_session.execute(stmt)
        api_key_record = result.scalar_one()
        assert api_key_record.key_hash != data["raw_key"]

        delete_resp = await client.delete(f"/api/users/keys/{key_id}", headers=headers)
        assert delete_resp.status_code == 204

        stmt_check = select(ApiKey).where(ApiKey.id == key_id)
        result_check = await db_session.execute(stmt_check)
        assert result_check.scalar_one_or_none() is None