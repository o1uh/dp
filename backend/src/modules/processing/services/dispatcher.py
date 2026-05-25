from sqlalchemy import select
from src.infrastructure.db.uow import UnitOfWork
from src.modules.processing.models import ProcessingTask, Stem
from src.core.worker.celery_app import celery_app
from src.modules.storage.repositories import FileRepository
from src.core.exceptions import NotFoundError, BusinessRuleError
from src.common.enums import FileProcessingStatus
from src.core.logger import logger

async def dispatch_task(user_id: str, file_id: str, model_config: dict) -> str:
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        file_obj = await file_repo.get_by_id(file_id)
        
        if not file_obj:
            raise NotFoundError("File not found")

        if file_obj.processing_status == FileProcessingStatus.awaiting_upload:
            raise BusinessRuleError("File upload is not confirmed yet")

        stmt_stems = select(Stem).where(Stem.file_id == file_obj.id)
        existing_stems = (await uow.session.execute(stmt_stems)).scalars().all()
        
        model_config_dict = dict(model_config) if model_config else {}
        
        logger.info(f"dispatch_task start: incoming model_config={model_config_dict}, existing_stems={len(existing_stems)}")

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

        task = ProcessingTask(
            user_id=user_id,
            file_id=file_id,
            model_config=model_config_dict
        )
        uow.session.add(task)
        await uow.session.flush()

        logger.info(f"dispatch_task queueing Celery process_audio: task_id={task.id}, config={model_config_dict}")

        celery_task = celery_app.send_task(
            "process_audio",
            args=[str(task.id), file_obj.s3_key_original, file_id, model_config_dict]
        )
        
        task.celery_task_id = celery_task.id
        await uow.commit()
        
        return str(task.id)