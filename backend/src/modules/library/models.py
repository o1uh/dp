import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TSVECTOR, ARRAY
from src.common.base_model import BaseModel
from src.common.enums import VisibilityStatus

class Track(BaseModel):
    __tablename__ = "tracks"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("files.id", ondelete="SET NULL"))
    source_session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("studio_sessions.id", ondelete="SET NULL"))
    
    title: Mapped[str] = mapped_column(String, nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String)
    genre: Mapped[str | None] = mapped_column(String)
    bpm: Mapped[int | None] = mapped_column(Integer)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    
    visibility: Mapped[VisibilityStatus] = mapped_column(Enum(VisibilityStatus), default=VisibilityStatus.private)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR)
    
    play_count: Mapped[int] = mapped_column(Integer, default=0)
    save_count: Mapped[int] = mapped_column(Integer, default=0)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0)
    
    deleted_at: Mapped[datetime | None] = mapped_column()

    __table_args__ = (
        Index('idx_tracks_search', 'search_vector', postgresql_using='gin'),
        Index('idx_tracks_tags', 'tags', postgresql_using='gin'),
        Index('idx_tracks_catalog_filters', 'visibility', 'genre', 'bpm'),
        Index('idx_tracks_popularity', 'play_count'),
    )

class UserStem(BaseModel):
    __tablename__ = "user_stems"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stem_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stems.id", ondelete="CASCADE"), nullable=False)
    track_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tracks.id", ondelete="CASCADE"))
    
    visibility: Mapped[VisibilityStatus] = mapped_column(Enum(VisibilityStatus), default=VisibilityStatus.private)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0)
    
    deleted_at: Mapped[datetime | None] = mapped_column()

    __table_args__ = (
        Index('idx_user_stems_user', 'user_id'),
        Index('idx_user_stems_visibility', 'visibility'),
        Index('idx_user_stems_tags', 'tags', postgresql_using='gin'),
        Index('idx_user_stems_search', 'search_vector', postgresql_using='gin'),
    )

class UserSavedTrack(BaseModel):
    __tablename__ = "user_saved_tracks"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    track_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        Index('idx_unique_saved_track', 'user_id', 'track_id', unique=True),
    )

class UserSavedStem(BaseModel):
    __tablename__ = "user_saved_stems"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_stem_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_stems.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        Index('idx_unique_saved_stem', 'user_id', 'user_stem_id', unique=True),
    )