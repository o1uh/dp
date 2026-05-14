import pytest
from unittest.mock import patch
from sqlalchemy import select
from src.modules.storage.models import File
from src.modules.processing.models import ProcessingTask
from src.common.enums import FileProcessingStatus, TaskStatus
from src.modules.processing.services.dispatcher import dispatch_task

@pytest.mark.asyncio
async def test_task_orchestration(db_session, setup_auth_user):
    _, user_id = setup_auth_user
    
    file_obj = File(
        file_hash="test_hash_disp",
        s3_key_original="orig/test.mp3",
        mime_type="audio/mpeg",
        file_size_bytes=1000,
        duration_sec=10.0,
        processing_status=FileProcessingStatus.uploaded
    )
    db_session.add(file_obj)
    await db_session.commit()

    model_config = {"model": "HT_Demucs_v4"}

    with patch("src.modules.processing.services.dispatcher.celery_app.send_task") as mock_send_task:
        mock_send_task.return_value.id = "celery_task_123"
        
        task_id = await dispatch_task(user_id, str(file_obj.id), model_config)
        
        stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
        result = await db_session.execute(stmt)
        task = result.scalar_one()

        assert task.status == TaskStatus.pending
        assert task.celery_task_id == "celery_task_123"
        mock_send_task.assert_called_once_with("process_audio", args=[str(task.id), "orig/test.mp3", str(file_obj.id)])