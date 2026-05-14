from src.infrastructure.db.uow import UnitOfWork
from src.infrastructure.transport.ws_manager import ws_manager
from src.modules.notifications.models import UserNotification
from src.modules.notifications.repositories import NotificationRepository

async def send_system_notification(user_id: str, activity_id: str, payload: dict):
    async with UnitOfWork() as uow:
        repo = NotificationRepository(uow.session)
        notification = UserNotification(
            user_id=user_id, 
            activity_id=activity_id
        )
        repo.add(notification)
        await uow.commit()

    payload["notification_id"] = str(notification.id)
    await ws_manager.send_personal_message(user_id, payload)