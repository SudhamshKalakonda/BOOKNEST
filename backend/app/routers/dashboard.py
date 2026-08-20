from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timezone

from app.database import get_db
from app.models.book import Book
from app.models.shelf import Shelf
from app.models.shelf_book import ShelfBook
from app.models.shelf_share import ShelfShare
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.dashboard import DashboardOut, ShelfSummary
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardOut)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    status_rows = (
        db.query(Book.status, func.count(Book.id))
        .filter(Book.owner_id == current_user.id)
        .group_by(Book.status)
        .all()
    )
    status_counts = {status: count for status, count in status_rows}

    current_year = datetime.now(timezone.utc).year
    finished_this_year = (
        db.query(func.count(Book.id))
        .filter(
            Book.owner_id == current_user.id,
            Book.status == "finished",
            func.extract("year", Book.finished_at) == current_year,
        )
        .scalar()
    )

    average_rating = (
        db.query(func.avg(Book.rating))
        .filter(Book.owner_id == current_user.id, Book.rating.isnot(None))
        .scalar()
    )
    average_rating = round(average_rating, 2) if average_rating is not None else None

    shelf_counts = (
        db.query(Shelf.id, Shelf.name, func.count(ShelfBook.id).label("book_count"))
        .outerjoin(ShelfBook, ShelfBook.shelf_id == Shelf.id)
        .filter(Shelf.owner_id == current_user.id)
        .group_by(Shelf.id, Shelf.name)
        .order_by(func.count(ShelfBook.id).desc())
        .first()
    )
    shelf_with_most_books = (
        ShelfSummary(id=shelf_counts[0], name=shelf_counts[1], book_count=shelf_counts[2])
        if shelf_counts and shelf_counts[2] > 0
        else None
    )

    books_lent_out = (
        db.query(func.count(Book.id))
        .filter(Book.owner_id == current_user.id, Book.lent_to_id.isnot(None))
        .scalar()
    )

    shelves_shared_with_me = (
        db.query(func.count(ShelfShare.id))
        .filter(ShelfShare.user_id == current_user.id)
        .scalar()
    )

    owned_shelf_ids = [
        row[0] for row in db.query(Shelf.id).filter(Shelf.owner_id == current_user.id).all()
    ]
    shared_shelf_ids = [
        row[0] for row in db.query(ShelfShare.shelf_id).filter(ShelfShare.user_id == current_user.id).all()
    ]
    visible_shelf_ids = list(set(owned_shelf_ids + shared_shelf_ids))

    recent_activity = (
        db.query(ActivityLog)
        .filter(
            or_(
                ActivityLog.actor_id == current_user.id,
                ActivityLog.shelf_id.in_(visible_shelf_ids) if visible_shelf_ids else False,
            )
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardOut(
        status_counts=status_counts,
        finished_this_year=finished_this_year or 0,
        average_rating=average_rating,
        shelf_with_most_books=shelf_with_most_books,
        books_lent_out=books_lent_out or 0,
        shelves_shared_with_me=shelves_shared_with_me or 0,
        recent_activity=recent_activity,
    )
