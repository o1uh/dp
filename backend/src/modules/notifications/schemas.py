from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationResponse(BaseModel):
    id: str
    activity_id: str
    is_read: bool
    created_at: datetime