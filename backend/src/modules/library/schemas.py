from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from src.common.enums import VisibilityStatus

class TrackUpdateDTO(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    bpm: Optional[int] = None
    tags: Optional[List[str]] = None
    visibility: Optional[VisibilityStatus] = None

class ProcessedModelInfo(BaseModel):
    task_id: str
    model_name: str
    stem_count: int
    created_at: datetime

class TrackResponse(BaseModel):
    id: str
    user_id: str
    file_id: Optional[str] = None
    title: str
    original_filename: Optional[str]
    genre: Optional[str]
    bpm: Optional[int]
    tags: Optional[List[str]]
    visibility: VisibilityStatus
    play_count: int
    save_count: int
    downloads_count: int
    created_at: datetime
    deleted_at: Optional[datetime] = None
    processed_models: List[ProcessedModelInfo] = []
    is_processing: bool = False

class TrackListResponse(BaseModel):
    items: List[TrackResponse]
    total: int
    page: int
    limit: int

class AliasCreateRequest(BaseModel):
    original_id: str

class StemVisibilityUpdateDTO(BaseModel):
    visibility: VisibilityStatus