from typing import List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.notifications.models import UserNotification

class NotificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_notifications(self, user_id: str, limit: int = 50) -> List[UserNotification]:
        stmt = (
            select(UserNotification)
            .where(UserNotification.user_id == user_id)
            .order_by(UserNotification.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def mark_as_read(self, notification_id: str, user_id: str) -> None:
        stmt = (
            update(UserNotification)
            .where(
                UserNotification.id == notification_id,
                UserNotification.user_id == user_id
            )
            .values(is_read=True)
        )
        await self.session.execute(stmt)

    def add(self, notification: UserNotification) -> None:
        self.session.add(notification)