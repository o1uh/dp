from src.infrastructure.db.uow import UnitOfWork
from src.modules.processing.models import ProcessingTask
from src.core.worker.celery_app import celery_app
from src.modules.storage.repositories import FileRepository
from src.core.exceptions import NotFoundError, BusinessRuleError
from src.common.enums import FileProcessingStatus

async def dispatch_task(user_id: str, file_id: str, model_config: dict) -> str:
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        file_obj = await file_repo.get_by_id(file_id)
        
        if not file_obj:
            raise NotFoundError("File not found")

        if file_obj.processing_status == FileProcessingStatus.awaiting_upload:
            raise BusinessRuleError("File upload is not confirmed yet")

        task = ProcessingTask(
            user_id=user_id,
            file_id=file_id,
            model_config=model_config
        )
        uow.session.add(task)
        await uow.session.flush()

        celery_task = celery_app.send_task(
            "process_audio",
            args=[str(task.id), file_obj.s3_key_original, file_id]
        )
        
        task.celery_task_id = celery_task.id
        await uow.commit()
        
        return str(task.id)