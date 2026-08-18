from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.book import Book
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.schemas.book import BookCreate, BookUpdate, BookOut
from typing import Optional
from sqlalchemy import or_
router = APIRouter(prefix="/books", tags=["books"])


@router.post("/", response_model=BookOut, status_code=status.HTTP_201_CREATED)
def create_book(
    payload: BookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_book = Book(
        owner_id=current_user.id,
        title=payload.title,
        author=payload.author,
        status=payload.status.value,
        total_pages=payload.total_pages,
        rating=payload.rating,
        notes=payload.notes,
    )

    db.add(new_book)
    db.commit()
    db.refresh(new_book)

    return new_book

@router.get("/", response_model=List[BookOut])
def list_books(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Book).filter(Book.owner_id == current_user.id)

    if status_filter:
        query = query.filter(Book.status == status_filter)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Book.title.ilike(search_pattern),
                Book.author.ilike(search_pattern),
            )
        )

    sort_columns = {
        "rating": Book.rating,
        "title": Book.title,
        "created_at": Book.created_at,
    }
    sort_column = sort_columns.get(sort_by, Book.created_at)

    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    offset = (page - 1) * page_size
    books = query.offset(offset).limit(page_size).all()

    return books


from datetime import datetime, timezone

@router.put("/{book_id}", response_model=BookOut)
def update_book(
    book_id: int,
    payload: BookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your book")

    update_data = payload.model_dump(exclude_unset=True)

    if "current_page" in update_data:
        new_current_page = update_data["current_page"]
        effective_total_pages = update_data.get("total_pages", book.total_pages)

        if new_current_page is not None:
            if effective_total_pages is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot set current page: total pages is not set for this book"
                )
            if new_current_page < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current page cannot be negative"
                )
            if new_current_page > effective_total_pages:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current page cannot exceed total pages"
                )

    for field, value in update_data.items():
        if field == "status" and value is not None:
            value = value.value
        setattr(book, field, value)

    if book.current_page is not None and book.total_pages is not None:
        if book.current_page == book.total_pages and book.status != "finished":
            book.status = "finished"
            book.finished_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(book)

    return book

















@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your book")

    db.delete(book)
    db.commit()

    return None