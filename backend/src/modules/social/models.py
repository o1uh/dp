import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from src.common.base_model import BaseModel, Base
from src.common.enums import ActivityType

class Subscription(Base):
    __tablename__ = "subscriptions"

    follower_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        Index('idx_subscriptions_following', 'following_id'),
    )

class ActivityFeed(BaseModel):
    __tablename__ = "activity_feed"

    producer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    track_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tracks.id", ondelete="CASCADE"))
    user_stem_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user_stems.id", ondelete="CASCADE"))
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("studio_sessions.id", ondelete="CASCADE"))
    
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType), default=ActivityType.new_release)

    __table_args__ = (
        Index('idx_feed_producer', 'producer_id'),
        Index('idx_feed_date', 'created_at'),
    )