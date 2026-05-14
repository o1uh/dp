import pytest
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy import select
from src.modules.storage.models import File
from src.modules.processing.models import ProcessingTask, Stem
from src.modules.billing.models import UsageLog, UserQuotaCurrent
from src.common.enums import FileProcessingStatus, TaskStatus
from src.modules.processing.schemas import WebhookPayload
from src.modules.processing.services.callback import process_webhook

@pytest.mark.asyncio
async def test_callback_transactional_billing(db_session, setup_auth_user):
    _, user_id_str = setup_auth_user
    user_uuid = uuid.UUID(user_id_str)

    quota = UserQuotaCurrent(
        user_id=user_uuid,
        period_start=datetime.utcnow(), 
        period_end=datetime.utcnow(),
        duration_used_sec=100.0, 
        storage_used_bytes=5000
    )
    file_obj = File(
        file_hash="test_cb", s3_key_original="orig.mp3", mime_type="audio/mp3",
        file_size_bytes=1000, duration_sec=50.0, processing_status=FileProcessingStatus.processing
    )
    db_session.add_all([quota, file_obj])
    await db_session.flush()

    task = ProcessingTask(
        user_id=user_uuid, file_id=file_obj.id, model_config={}, status=TaskStatus.processing
    )
    db_session.add(task)
    await db_session.commit()

    success_payload = WebhookPayload(
        task_id=str(task.id), file_id=str(file_obj.id), status="completed",
        error_message=None,
        stems=[
            {"stem_class": "vocals", "s3_key_flac": "v.flac", "s3_key_mp3": "v.mp3", "file_size_bytes": 1000, "model_version": "v4"}
        ]
    )

    mock_redis = MagicMock()
    mock_redis.publish = AsyncMock()
    mock_redis.close = AsyncMock()

    with patch("src.modules.processing.services.callback.Redis.from_url", return_value=mock_redis):
        await process_webhook(success_payload)
        
        logs = (await db_session.execute(select(UsageLog).where(UsageLog.task_id == task.id))).scalars().all()
        stems = (await db_session.execute(select(Stem).where(Stem.task_id == task.id))).scalars().all()
        assert len(logs) == 1
        assert len(stems) == 1
        assert logs[0].duration_sec_used == 50.0

    fail_payload = WebhookPayload(
        task_id=str(task.id), file_id=str(file_obj.id), status="failed", error_message="OOM Error", stems=[]
    )
    
    with patch("src.modules.processing.services.callback.Redis.from_url", return_value=mock_redis):
        await process_webhook(fail_payload)
        
        await db_session.refresh(task)
        await db_session.refresh(quota)
        assert task.status == TaskStatus.failed
        assert task.error_message == "OOM Error"
        assert quota.duration_used_sec == 50.0