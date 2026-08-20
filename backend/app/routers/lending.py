from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.book import Book
from app.models.user import User
from app.schemas.lending import LendBookRequest, BorrowedBookOut
from app.schemas.book import BookOut
from app.auth.dependencies import get_current_user
from app.services.activity import log_activity
from app.services.connection_manager import manager

router = APIRouter(prefix="/lending", tags=["lending"])


@router.post("/{book_id}/lend", response_model=BookOut)
async def lend_book(
    book_id: int,
    payload: LendBookRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your book")

    if book.lent_to_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This book is already lent to someone")

    borrower = db.query(User).filter(User.email == payload.borrower_email).first()
    if not borrower:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No registered user with that email")

    if borrower.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot lend a book to yourself")

    book.lent_to_id = borrower.id
    db.commit()
    db.refresh(book)

    await log_activity(
        db,
        actor_id=current_user.id,
        event_type="book_lent",
        message=f"{current_user.name} lent \"{book.title}\" to {borrower.name}",
        book_id=book.id,
    )

    await manager.send_to_user(borrower.id, {
        "type": "book_lent",
        "book_id": book.id,
        "title": book.title,
        "author": book.author,
        "lent_by": current_user.name,
    })

    return book


@router.post("/{book_id}/return", response_model=BookOut)
async def return_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your book")

    if book.lent_to_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This book is not currently lent to anyone")

    borrower_id = book.lent_to_id
    book.lent_to_id = None
    db.commit()
    db.refresh(book)

    await log_activity(
        db,
        actor_id=current_user.id,
        event_type="book_returned",
        message=f"{current_user.name} marked \"{book.title}\" as returned",
        book_id=book.id,
    )

    await manager.send_to_user(borrower_id, {
        "type": "book_returned",
        "book_id": book.id,
        "title": book.title,
    })

    return book


@router.get("/borrowed", response_model=List[BorrowedBookOut])
def borrowed_from_others(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    books = db.query(Book).filter(Book.lent_to_id == current_user.id).all()
    return books
