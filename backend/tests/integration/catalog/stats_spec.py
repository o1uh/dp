import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from src.main import app
from src.modules.library.models import Track, UserSavedTrack
from src.modules.storage.models import File
from src.common.enums import VisibilityStatus, FileProcessingStatus
import uuid

@pytest.mark.asyncio
async def test_track_statistics_incrementation(db_session, setup_auth_user):
    token, user_id = setup_auth_user
    user_uuid = uuid.UUID(user_id)

    file_obj = File(file_hash="statshash", s3_key_original="test.mp3", mime_type="audio/mp3", file_size_bytes=100, duration_sec=10, processing_status=FileProcessingStatus.ready)
    db_session.add(file_obj)
    await db_session.flush()

    track = Track(user_id=user_uuid, file_id=file_obj.id, title="Stat Track", visibility=VisibilityStatus.public)
    db_session.add(track)
    await db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        
        res_dl = await client.get(f"/api/tracks/{track.id}/download", headers=headers)
        assert res_dl.status_code == 200
        
        await db_session.refresh(track)
        assert track.downloads_count == 1

        res_save = await client.post("/api/tracks/save-alias", json={"original_id": str(track.id)}, headers=headers)
        assert res_save.status_code == 201
        
        await db_session.refresh(track)
        assert track.save_count == 1

        stmt = select(UserSavedTrack).where(UserSavedTrack.track_id == track.id)
        saved_record = (await db_session.execute(stmt)).scalar_one_or_none()
        assert saved_record is not None