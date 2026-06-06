from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

class FileUploadRequest(BaseModel):
    file_hash: str
    mime_type: str
    file_size_bytes: int
    duration_sec: float
    original_filename: str
    separation_mode: Optional[str] = "htdemucs"
    title: Optional[str] = Field(default=None, description="User-provided display name for the track")

class FileUploadResponse(BaseModel):
    is_duplicate: bool
    upload_url: Optional[str] = None
    file_id: Optional[UUID] = None
    s3_key: Optional[str] = None
    stems: Optional[List[dict]] = None

class FileConfirmRequest(BaseModel):
    file_id: UUID