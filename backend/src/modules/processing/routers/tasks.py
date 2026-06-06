from fastapi import APIRouter, Depends, HTTPException, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.processing.schemas import TaskStartRequest, TaskStatusResponse
from src.modules.processing.services.dispatcher import dispatch_task
from src.infrastructure.db.uow import UnitOfWork
from src.modules.processing.repositories.tasks import TaskRepository

router = APIRouter(prefix="/tasks", tags=["Processing"])

@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_task(data: TaskStartRequest, current_user: User = Depends(get_current_user)):
    # print(f"[API ROUTER] create_task hit. file_id={data.file_id}, incoming config={data.config}", flush=True)
    task_id = await dispatch_task(str(current_user.id), data.file_id, data.config, data.title)
    return {"task_id": task_id}

@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, current_user: User = Depends(get_current_user)):
    async with UnitOfWork() as uow:
        repo = TaskRepository(uow.session)
        task = await repo.get_by_id(task_id)
        if not task or str(task.user_id) != str(current_user.id):
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskStatusResponse(
            id=str(task.id), 
            status=task.status, 
            error_message=task.error_message
        )