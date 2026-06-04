import uuid
import os
from src.infrastructure.db.uow import UnitOfWork
from src.modules.studio.repositories import StudioRepository
from src.modules.storage.repositories import FileRepository
from src.modules.processing.models import ProcessingTask, Stem
from src.modules.storage.models import File
from src.core.worker.celery_app import celery_app
from src.core.exceptions import NotFoundError, BusinessRuleError, AccessDeniedError
from src.common.enums import FileProcessingStatus
from src.infrastructure.redis.client import get_redis_client
from src.core.logger import logger

async def initiate_render(user_id: str, session_id: str) -> str:
    logger.info(f"Initiating DAW session mixdown compilation. User: {user_id}, Session: {session_id}")

    env_mock = os.getenv("MOCK_ML_PROCESSING", "False").lower() in ("true", "1", "yes")
    redis_mock = False
    r_client = None
    try:
        r_client = get_redis_client()
        val = await r_client.get("MOCK_ML_PROCESSING")
        redis_mock = (val == "True")
    except Exception as e:
        logger.warning(f"[RENDER] Failed to read mock mode from Redis: {e}")
    finally:
        if r_client:
            await r_client.close()

    is_mock_mode = env_mock or redis_mock

    async with UnitOfWork() as uow:
        studio_repo = StudioRepository(uow.session)

        # logger.info(f"Querying studio session details for render: {session_id}")
        session = await studio_repo.get_session_by_id(session_id)
        if not session:
            logger.error(f"Render failed: Session {session_id} not found")
            raise NotFoundError("Session not found")

        # logger.info(f"Verifying owner permissions. Owner ID: {session.user_id}, Requester: {user_id}")
        if str(session.user_id) != user_id:
            logger.error("Render failed: Requester is not authorized to edit this session")
            raise AccessDeniedError("Access denied to this session")

        # logger.info(f"Fetching active tracks list...")
        tracks = await studio_repo.get_session_tracks(session_id)
        if not tracks:
            logger.error("Render failed: Empty session tracks list")
            raise BusinessRuleError("Cannot render empty session")

        any_solo = any(track.is_solo for track in tracks)
        # logger.info(f"Track processing constraints: Total tracks: {len(tracks)}, Solo mode active: {any_solo}")

        track_configs = []
        for track in tracks:
            # logger.info(f"Asserting mixing properties for track index: {track.track_index}. Muted: {track.is_muted}, Soloed: {track.is_solo}")
            if track.is_muted:
                # logger.info(f"Skipping track {track.track_index} (Muted)")
                continue

            if any_solo and not track.is_solo:
                # logger.info(f"Skipping track {track.track_index} (Solo mode override constraint)")
                continue

            s3_key = None
            if track.stem_id:
                # logger.info(f"Resolving physical stem source for ID: {track.stem_id}")
                phys_stem = await uow.session.get(Stem, track.stem_id)
                if phys_stem:
                    s3_key = phys_stem.s3_key_flac
            elif track.file_id:
                # logger.info(f"Resolving physical original file source for ID: {track.file_id}")
                file_repo = FileRepository(uow.session)
                file_obj = await file_repo.get_by_id(str(track.file_id))
                if file_obj:
                    s3_key = file_obj.s3_key_original

            if not s3_key:
                logger.warning(f"Skipping track index {track.track_index}: Failed to resolve physical file keys on S3")
                continue

            # logger.info(f"Adding track {track.track_index} configuration properties. Volume: {track.volume}, Pan: {track.pan}, Offsets: {track.start_offset_ms}ms")
            track_configs.append({
                "s3_key": s3_key,
                "volume": track.volume,
                "pan": track.pan,
                "start_offset_ms": track.start_offset_ms,
                "trim_start_ms": track.trim_start_ms,
                "trim_end_ms": track.trim_end_ms
            })

        if not track_configs:
            logger.error("Render failed: No active signal tracks selected after filters applied")
            raise BusinessRuleError("No active tracks to render")

        mix_file_id = uuid.uuid4()
        s3_output_path = f"renders/{session_id}/{mix_file_id}.flac"
        # logger.info(f"Registering mixdown database placeholder for output compilation. ID: {mix_file_id}, S3 Key: {s3_output_path}")

        mix_file = File(
            id=mix_file_id,
            file_hash=str(uuid.uuid4()),
            s3_key_original=s3_output_path,
            mime_type="audio/flac",
            file_size_bytes=0,
            duration_sec=0.0,
            processing_status=FileProcessingStatus.processing
        )
        uow.session.add(mix_file)
        await uow.session.flush()

        session.exported_file_id = mix_file_id

        # Формируем конфигурацию задачи с закрепленным флагом симуляции
        model_config = {"type": "render", "session_id": session_id}
        if is_mock_mode:
            model_config["is_mock_mode"] = True

        # logger.info("Registering processing task container in database...")
        task = ProcessingTask(
            user_id=uuid.UUID(user_id),
            file_id=mix_file_id,
            model_config=model_config
        )
        uow.session.add(task)
        await uow.session.flush()
        # logger.info(f"Processing task created successfully. Task ID: {task.id}")

        logger.info(f"Forwarding render task parameters to Celery worker queue 'render_session'. Task ID: {task.id}")
        celery_task = celery_app.send_task(
            "render_session",
            args=[str(task.id), track_configs, str(mix_file_id), task.model_config]
        )

        # logger.info(f"Celery task successfully queued with Job ID: {celery_task.id}")
        task.celery_task_id = celery_task.id
        await uow.commit()

        # logger.info("Render transaction successfully initialized and committed.")
        return str(task.id)