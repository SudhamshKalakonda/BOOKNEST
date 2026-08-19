from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class ShelfShare(Base):
    __tablename__ = "shelf_shares"

    id = Column(Integer, primary_key=True, index=True)
    shelf_id = Column(Integer, ForeignKey("shelves.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
