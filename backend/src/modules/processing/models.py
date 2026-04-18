import uuid
from datetime import datetime
from sqlalchemy import String, Text, BigInteger, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from src.common.base_model import BaseModel
from src.common.enums import TaskStatus

class ProcessingTask(BaseModel):
    __tablename__ = "processing_tasks"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    model_config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.pending)
    celery_task_id: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column()
    completed_at: Mapped[datetime | None] = mapped_column()
    api_key_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("api_keys.id", ondelete="SET NULL"))

    __table_args__ = (
        Index('idx_tasks_status', 'status'),
        Index('idx_tasks_celery_id', 'celery_task_id'),
        Index('idx_tasks_status_date', 'status', 'created_at'),
    )

class Stem(BaseModel):
    __tablename__ = "stems"

    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("processing_tasks.id", ondelete="CASCADE"), nullable=False)
    stem_class: Mapped[str] = mapped_column(String, nullable=False)
    model_version: Mapped[str] = mapped_column(String, nullable=False)
    s3_key_flac: Mapped[str] = mapped_column(String, nullable=False)
    s3_key_mp3: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    __table_args__ = (
        Index('idx_physical_stem_unique', 'file_id', 'stem_class', 'model_version', unique=True),
        Index('idx_stems_task', 'task_id'),
    )