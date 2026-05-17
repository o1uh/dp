import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from src.main import app
from src.modules.studio.models import StudioSession, StudioSessionTrack
from src.modules.processing.models import ProcessingTask
from src.common.enums import TaskStatus
import uuid

@pytest.mark.asyncio
async def test_session_render_pipeline(db_session, setup_auth_user):
    token, user_id = setup_auth_user
    user_uuid = uuid.UUID(user_id)
    session_id = uuid.uuid4()

    session = StudioSession(id=session_id, user_id=user_uuid, project_name="Render Test", global_settings={})
    db_session.add(session)
    await db_session.flush()

    track = StudioSessionTrack(
        session_id=session.id, file_id=uuid.uuid4(), track_index=0, 
        volume=1.0, pan=0.0, is_muted=False, is_solo=False, 
        start_offset_ms=0, trim_start_ms=0
    )
    db_session.add(track)
    await db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}
        
        response = await client.post(f"/api/sessions/{str(session_id)}/export", headers=headers)
        
        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        
        task_id = uuid.UUID(data["task_id"])
        stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
        result = await db_session.execute(stmt)
        task = result.scalar_one()

        assert task.user_id == user_uuid
        assert task.status == TaskStatus.pending
        assert task.model_config["type"] == "render"
        assert task.celery_task_id is not None