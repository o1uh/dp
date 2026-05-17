from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID

class StudioTrackDTO(BaseModel):
    id: Optional[str] = None
    stem_id: Optional[str] = None
    file_id: Optional[str] = None
    track_index: int
    volume: float = Field(ge=0.0, le=2.0)
    pan: float = Field(ge=-1.0, le=1.0)
    is_muted: bool
    is_solo: bool
    start_offset_ms: int = Field(ge=0)
    trim_start_ms: int = Field(ge=0)
    trim_end_ms: Optional[int] = None

class SessionSaveRequest(BaseModel):
    project_name: str
    global_settings: Dict[str, Any]
    tracks: List[StudioTrackDTO]

class SessionLoadResponse(BaseModel):
    id: str
    project_name: str
    global_settings: Dict[str, Any]
    tracks: List[StudioTrackDTO]