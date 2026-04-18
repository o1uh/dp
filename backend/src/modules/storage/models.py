from datetime import datetime
from sqlalchemy import String, BigInteger, Float, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column
from src.common.base_model import BaseModel
from src.common.enums import FileProcessingStatus

class File(BaseModel):
    __tablename__ = "files"

    file_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    s3_key_original: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    duration_sec: Mapped[float] = mapped_column(Float, nullable=False)
    processing_status: Mapped[FileProcessingStatus] = mapped_column(Enum(FileProcessingStatus), default=FileProcessingStatus.awaiting_upload)
    deleted_at: Mapped[datetime | None] = mapped_column()

    __table_args__ = (
        Index('idx_files_hash', 'file_hash', postgresql_using='hash'),
        Index('idx_files_status', 'processing_status'),
    )