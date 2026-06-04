from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from src.common.enums import VisibilityStatus
from src.modules.library.schemas import ProcessedModelInfo

class CatalogTrackResponse(BaseModel):
    id: str
    user_id: str
    title: str
    original_filename: Optional[str] = None
    genre: Optional[str] = None
    bpm: Optional[int] = None
    tags: Optional[List[str]] = None
    visibility: VisibilityStatus
    play_count: int
    save_count: int
    downloads_count: int
    created_at: datetime
    is_saved: bool
    processed_models: List[ProcessedModelInfo] = []

class SearchResultResponse(BaseModel):
    items: List[CatalogTrackResponse]
    total: int
    page: int
    limit: int