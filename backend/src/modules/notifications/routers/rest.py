from typing import List
from fastapi import APIRouter, Depends, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.notifications.schemas import NotificationResponse
from src.infrastructure.db.uow import UnitOfWork
from src.modules.notifications.repositories import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(current_user: User = Depends(get_current_user)):
    async with UnitOfWork() as uow:
        repo = NotificationRepository(uow.session)
        notifications = await repo.get_user_notifications(str(current_user.id))
        
        return [
            NotificationResponse(
                id=str(n.id),
                activity_id=str(n.activity_id),
                is_read=n.is_read,
                created_at=n.created_at
            ) for n in notifications
        ]

@router.put("/{id}/read", status_code=status.HTTP_200_OK)
async def mark_read(id: str, current_user: User = Depends(get_current_user)):
    async with UnitOfWork() as uow:
        repo = NotificationRepository(uow.session)
        await repo.mark_as_read(id, str(current_user.id))
        await uow.commit()
    return {"status": "ok"}