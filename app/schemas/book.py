from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

class BookStatus(str, Enum):
    want_to_read = "want_to_read"
    reading = "reading"
    finished = "finished"

class BookCreate(BaseModel):
    title: str
    author: str
    status: BookStatus = BookStatus.want_to_read
    total_pages: Optional[int] = None
    rating: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not (1 <= value <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return value

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    status: Optional[BookStatus] = None
    total_pages: Optional[int] = None
    current_page: Optional[int] = None
    rating: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not (1 <= value <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return value

class BookOut(BaseModel):
    id: int
    owner_id: int
    title: str
    author: str
    status: str
    total_pages: Optional[int]
    current_page: Optional[int]
    rating: Optional[int]
    notes: Optional[str]
    finished_at: Optional[datetime]
    lent_to_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True