from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from src.common.enums import TaskStatus

class TaskStartRequest(BaseModel):
    file_id: str
    config: Dict[str, str]
    title: Optional[str] = Field(default=None, description="User-provided display name for the track")

class TaskStatusResponse(BaseModel):
    id: str
    status: TaskStatus
    error_message: Optional[str] = None

class StemPayload(BaseModel):
    stem_class: str
    s3_key_flac: str
    s3_key_mp3: str
    file_size_bytes: int
    model_version: str
    task_id: Optional[str] = None

class WebhookPayload(BaseModel):
    task_id: str
    file_id: str
    status: str
    error_message: Optional[str] = None
    stems: List[StemPayload] = []