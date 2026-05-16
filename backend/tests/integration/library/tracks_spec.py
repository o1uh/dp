import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from src.main import app
from src.modules.library.models import Track
from src.common.enums import VisibilityStatus
import uuid

@pytest.mark.asyncio
async def test_soft_deleted_tracks_filtering(db_session, setup_auth_user):
    token, user_id = setup_auth_user
    user_uuid = uuid.UUID(user_id)

    track1 = Track(user_id=user_uuid, title="Active Track", visibility=VisibilityStatus.public)
    track2 = Track(user_id=user_uuid, title="Deleted Track", visibility=VisibilityStatus.public, deleted_at=datetime.utcnow())
    
    db_session.add_all([track1, track2])
    await db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}

        res_lib = await client.get("/api/tracks", headers=headers)
        assert res_lib.status_code == 200
        lib_data = res_lib.json()
        assert lib_data["total"] == 1
        assert lib_data["items"][0]["title"] == "Active Track"

        res_cat = await client.get("/api/catalog/search", headers=headers)
        assert res_cat.status_code == 200
        cat_data = res_cat.json()
        assert any(t["title"] == "Active Track" for t in cat_data["items"])
        assert not any(t["title"] == "Deleted Track" for t in cat_data["items"])