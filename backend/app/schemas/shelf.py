from pydantic import BaseModel
from datetime import datetime
from typing import List

class ShelfCreate(BaseModel):
    name: str

class ShelfOut(BaseModel):
    id: int
    owner_id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

class ShelfWithBooks(ShelfOut):
    books: List["BookOut"] = []

from app.schemas.book import BookOut
ShelfWithBooks.model_rebuild()