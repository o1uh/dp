import uuid
from sqlalchemy import String, Integer, Float, Boolean, BigInteger, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from src.common.base_model import BaseModel

class StudioSession(BaseModel):
    __tablename__ = "studio_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_name: Mapped[str] = mapped_column(String, nullable=False)
    exported_file_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("files.id", ondelete="SET NULL"))
    global_settings: Mapped[dict | None] = mapped_column(JSONB)

class StudioSessionTrack(BaseModel):
    __tablename__ = "studio_session_tracks"

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("studio_sessions.id", ondelete="CASCADE"), nullable=False)
    stem_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("stems.id", ondelete="SET NULL"))
    file_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("files.id", ondelete="SET NULL"))
    track_index: Mapped[int] = mapped_column(Integer, nullable=False)
    
    volume: Mapped[float] = mapped_column(Float, default=1.0)
    pan: Mapped[float] = mapped_column(Float, default=0.0)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_solo: Mapped[bool] = mapped_column(Boolean, default=False)
    
    start_offset_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    trim_start_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    trim_end_ms: Mapped[int | None] = mapped_column(BigInteger)

    __table_args__ = (
        CheckConstraint('(stem_id IS NULL) != (file_id IS NULL)', name='check_stem_or_file'),
        Index('idx_session_track_index', 'session_id', 'track_index', unique=True),
    )