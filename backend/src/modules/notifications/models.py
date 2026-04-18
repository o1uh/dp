import uuid
from sqlalchemy import Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from src.common.base_model import BaseModel

class UserNotification(BaseModel):
    __tablename__ = "user_notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("activity_feed.id", ondelete="CASCADE"), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        Index('idx_user_notifications_state', 'user_id', 'is_read'),
    )