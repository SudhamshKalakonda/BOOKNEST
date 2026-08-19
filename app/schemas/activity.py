from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ActivityLogOut(BaseModel):
    id: int
    actor_id: int
    event_type: str
    message: str
    shelf_id: Optional[int]
    book_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
