import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.modules.storage.models import File
from src.modules.processing.models import ProcessingTask, Stem
from src.common.enums import FileProcessingStatus, TaskStatus

@pytest.mark.asyncio
async def test_deduplication_logic(db_session, setup_auth_user):
    token, user_id = setup_auth_user
    file_hash = "fake_sha256_hash_123"

    file_obj = File(
        file_hash=file_hash,
        s3_key_original="originals/test.mp3",
        mime_type="audio/mpeg",
        file_size_bytes=1024,
        duration_sec=60.0,
        processing_status=FileProcessingStatus.ready
    )
    db_session.add(file_obj)
    await db_session.flush()

    task_obj = ProcessingTask(
        user_id=user_id,
        file_id=file_obj.id,
        model_config={"model": "htdemucs"},
        status=TaskStatus.completed
    )
    db_session.add(task_obj)
    await db_session.flush()

    stem_obj = Stem(
        file_id=file_obj.id,
        task_id=task_obj.id,
        stem_class="vocals",
        model_version="HT_Demucs_v4",
        s3_key_flac="stems/vocals.flac",
        s3_key_mp3="stems/vocals.mp3",
        file_size_bytes=512
    )
    db_session.add(stem_obj)
    await db_session.commit()

    payload = {
        "file_hash": file_hash,
        "mime_type": "audio/mpeg",
        "file_size_bytes": 1024,
        "duration_sec": 60.0,
        "original_filename": "test.mp3" 
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/files/upload-init",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_duplicate"] is True
        assert data["upload_url"] is None
        assert len(data["stems"]) == 1
        assert data["stems"][0]["stem_class"] == "vocals"