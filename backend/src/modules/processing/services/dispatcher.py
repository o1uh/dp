import uuid
from sqlalchemy import select
from src.infrastructure.db.uow import UnitOfWork
from src.modules.processing.models import ProcessingTask, Stem
from src.modules.library.models import Track, UserStem  # Добавлен импорт
from src.core.worker.celery_app import celery_app
from src.modules.storage.repositories import FileRepository
from src.core.exceptions import NotFoundError, BusinessRuleError
from src.common.enums import FileProcessingStatus, TaskStatus
from src.core.logger import logger

async def dispatch_task(user_id: str, file_id: str, model_config: dict) -> str:
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        file_obj = await file_repo.get_by_id(file_id)
        
        if not file_obj:
            raise NotFoundError("File not found")

        if file_obj.processing_status == FileProcessingStatus.awaiting_upload:
            raise BusinessRuleError("File upload is not confirmed yet")

        model_config_dict = dict(model_config) if model_config else {}
        model_type = model_config_dict.get("model", "htdemucs")
        
        logger.info(f"dispatch_task start: incoming model_config={model_config_dict}")

        stmt_completed = select(ProcessingTask).where(
            ProcessingTask.file_id == file_obj.id,
            ProcessingTask.status == TaskStatus.completed
        )
        all_completed = (await uow.session.execute(stmt_completed)).scalars().all()
        
        existing_completed_task = next(
            (t for t in all_completed if t.model_config.get("model") == model_type),
            None
        )

        if existing_completed_task:
            logger.info(f"Instant clone triggered in dispatch_task for model {model_type}")
            
            stmt_task_check = select(ProcessingTask).where(
                ProcessingTask.file_id == file_obj.id,
                ProcessingTask.user_id == uuid.UUID(user_id),
                ProcessingTask.model_config == existing_completed_task.model_config
            )
            cloned_task = (await uow.session.execute(stmt_task_check)).scalar_one_or_none()

            if not cloned_task:
                cloned_task = ProcessingTask(
                    user_id=uuid.UUID(user_id),
                    file_id=file_obj.id,
                    model_config=existing_completed_task.model_config,
                    status=TaskStatus.completed,
                    celery_task_id=existing_completed_task.celery_task_id,
                    started_at=existing_completed_task.started_at,
                    completed_at=existing_completed_task.completed_at
                )
                uow.session.add(cloned_task)
                await uow.session.flush()

            stmt_stems = select(Stem).where(Stem.task_id == existing_completed_task.id)
            orig_stems = (await uow.session.execute(stmt_stems)).scalars().all()

            stmt_track = select(Track).where(
                Track.user_id == uuid.UUID(user_id),
                Track.file_id == file_obj.id,
                Track.deleted_at.is_(None)
            )
            track = (await uow.session.execute(stmt_track)).scalar_one_or_none()

            if track:
                for s_orig in orig_stems:
                    stmt_us_check = select(UserStem).where(
                        UserStem.user_id == uuid.UUID(user_id),
                        UserStem.stem_id == s_orig.id
                    )
                    existing_us = (await uow.session.execute(stmt_us_check)).scalar_one_or_none()
                    
                    if not existing_us:
                        user_stem = UserStem(
                            user_id=uuid.UUID(user_id),
                            stem_id=s_orig.id,
                            track_id=track.id
                        )
                        uow.session.add(user_stem)

            await uow.commit()
            return str(cloned_task.id)

        stmt_stems = select(Stem).where(Stem.file_id == file_obj.id)
        existing_stems = (await uow.session.execute(stmt_stems)).scalars().all()

        if len(existing_stems) >= 4:
            logger.info("Enforcing 'cascade_guitar' model and populating cached stems.")
            model_config_dict["model"] = "cascade_guitar"
            model_config_dict["cached_stems"] = {
                s.stem_class: {
                    "s3_key_flac": s.s3_key_flac,
                    "s3_key_mp3": s.s3_key_mp3,
                    "file_size_bytes": s.file_size_bytes,
                    "model_version": s.model_version
                } for s in existing_stems if s.stem_class in ["drums", "bass", "vocals", "other"]
            }

        parent_task = None
        if model_config_dict.get("model") == "cascade_guitar" and len(existing_stems) < 4:
            parent_task = ProcessingTask(
                user_id=user_id,
                file_id=file_id,
                model_config={"model": "htdemucs"},
                status=TaskStatus.pending
            )
            uow.session.add(parent_task)
            await uow.session.flush()
            model_config_dict["parent_task_id"] = str(parent_task.id)

        task = ProcessingTask(
            user_id=user_id,
            file_id=file_id,
            model_config=model_config_dict
        )
        uow.session.add(task)
        await uow.session.flush()

        logger.info(f"dispatch_task queueing Celery process_audio: task_id={task.id}, config={model_config_dict}")
        print(f"[API DISPATCHER] Queueing Celery task. task_id={task.id}, config={model_config_dict}", flush=True)
        celery_task = celery_app.send_task(
            "process_audio",
            args=[str(task.id), file_obj.s3_key_original, file_id, model_config_dict]
        )
        
        task.celery_task_id = celery_task.id
        if parent_task:
            parent_task.celery_task_id = celery_task.id

        await uow.commit()
        return str(task.id)