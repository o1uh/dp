import uuid
from src.infrastructure.db.uow import UnitOfWork
from src.modules.studio.repositories import StudioRepository
from src.modules.storage.repositories import FileRepository
from src.modules.processing.models import ProcessingTask, Stem
from src.modules.storage.models import File
from src.core.worker.celery_app import celery_app
from src.core.exceptions import NotFoundError, BusinessRuleError
from src.common.enums import FileProcessingStatus

async def initiate_render(user_id: str, session_id: str) -> str:
    async with UnitOfWork() as uow:
        studio_repo = StudioRepository(uow.session)
        
        session = await studio_repo.get_session_by_id(session_id)
        if not session:
            raise NotFoundError("Session not found")

        if str(session.user_id) != user_id:
            raise AccessDeniedError("Access denied to this session")

        tracks = await studio_repo.get_session_tracks(session_id)
        if not tracks:
            raise BusinessRuleError("Cannot render empty session")

        track_configs = []
        for track in tracks:
            if track.is_muted:
                continue

            s3_key = None
            if track.stem_id:
                phys_stem = await uow.session.get(Stem, track.stem_id)
                if phys_stem:
                    s3_key = phys_stem.s3_key_flac
            elif track.file_id:
                file_repo = FileRepository(uow.session)
                file_obj = await file_repo.get_by_id(str(track.file_id))
                if file_obj:
                    s3_key = file_obj.s3_key_original

            if not s3_key:
                continue

            track_configs.append({
                "s3_key": s3_key,
                "volume": track.volume,
                "pan": track.pan,
                "start_offset_ms": track.start_offset_ms,
                "trim_start_ms": track.trim_start_ms,
                "trim_end_ms": track.trim_end_ms
            })

        if not track_configs:
            raise BusinessRuleError("No active tracks to render")

        mix_file_id = uuid.uuid4()
        mix_file = File(
            id=mix_file_id,
            file_hash=str(uuid.uuid4()), 
            s3_key_original=f"renders/{session_id}/{mix_file_id}.flac",
            mime_type="audio/flac",
            file_size_bytes=0,
            duration_sec=0.0,
            processing_status=FileProcessingStatus.processing
        )
        uow.session.add(mix_file)
        
        await uow.session.flush() 
        
        session.exported_file_id = mix_file_id

        task = ProcessingTask(
            user_id=uuid.UUID(user_id),
            file_id=mix_file_id,
            model_config={"type": "render", "session_id": session_id}
        )
        uow.session.add(task)
        await uow.session.flush()

        celery_task = celery_app.send_task(
            "render_session",
            args=[str(task.id), track_configs, str(mix_file_id)]
        )
        
        task.celery_task_id = celery_task.id
        await uow.commit()

        return str(task.id)