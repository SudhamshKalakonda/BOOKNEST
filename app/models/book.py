from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.sql import func
from app.database import Base

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    status = Column(String, nullable=False, default="want_to_read")
    total_pages = Column(Integer, nullable=True)
    current_page = Column(Integer, nullable=True)
    rating = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    lent_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())