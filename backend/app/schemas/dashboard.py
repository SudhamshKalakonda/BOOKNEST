from pydantic import BaseModel
from typing import Optional, List
from app.schemas.activity import ActivityLogOut

class ShelfSummary(BaseModel):
    id: int
    name: str
    book_count: int

class DashboardOut(BaseModel):
    status_counts: dict
    finished_this_year: int
    average_rating: Optional[float]
    shelf_with_most_books: Optional[ShelfSummary]
    books_lent_out: int
    shelves_shared_with_me: int
    recent_activity: List[ActivityLogOut]
