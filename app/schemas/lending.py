from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class LendBookRequest(BaseModel):
    borrower_email: EmailStr

class BorrowedBookOut(BaseModel):
    id: int
    owner_id: int
    title: str
    author: str
    status: str
    total_pages: Optional[int]
    current_page: Optional[int]
    rating: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
