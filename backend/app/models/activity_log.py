from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    shelf_id = Column(Integer, ForeignKey("shelves.id"), nullable=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
