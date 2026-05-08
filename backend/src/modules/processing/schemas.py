from pydantic import BaseModel
from typing import List, Optional, Dict
from src.common.enums import TaskStatus

class TaskStartRequest(BaseModel):
    file_id: str
    model_config: Dict[str, str]

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

class WebhookPayload(BaseModel):
    task_id: str
    file_id: str
    status: str
    error_message: Optional[str] = None
    stems: List[StemPayload] = []