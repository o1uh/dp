from pydantic import BaseModel
from typing import List, Optional
from src.modules.library.schemas import TrackResponse

class SearchResultResponse(BaseModel):
    items: List[TrackResponse]
    total: int
    page: int
    limit: int