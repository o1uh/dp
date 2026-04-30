from src.infrastructure.db.uow import UnitOfWork
from src.modules.processing.models import ProcessingTask
from src.modules.processing.tasks import process_audio
from src.modules.storage.repositories import FileRepository
from src.core.exceptions import NotFoundError

async def dispatch_task(user_id: str, file_id: str, model_config: dict) -> str:
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        file_obj = await file_repo.get_by_id(file_id)
        
        if not file_obj:
            raise NotFoundError("File not found")

        task = ProcessingTask(
            user_id=user_id,
            file_id=file_id,
            model_config=model_config
        )
        uow.session.add(task)
        await uow.session.flush()

        celery_task = process_audio.delay(str(task.id), file_obj.s3_key_original, file_id)
        
        task.celery_task_id = celery_task.id
        await uow.commit()
        
        return str(task.id)