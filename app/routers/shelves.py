from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.shelf import Shelf
from app.models.shelf_book import ShelfBook
from app.models.book import Book
from app.models.user import User
from app.schemas.shelf import ShelfCreate, ShelfOut, ShelfWithBooks
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/shelves", tags=["shelves"])


@router.post("/", response_model=ShelfOut, status_code=status.HTTP_201_CREATED)
def create_shelf(
    payload: ShelfCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_shelf = Shelf(owner_id=current_user.id, name=payload.name)
    db.add(new_shelf)
    db.commit()
    db.refresh(new_shelf)
    return new_shelf


@router.get("/", response_model=List[ShelfOut])
def list_shelves(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelves = db.query(Shelf).filter(Shelf.owner_id == current_user.id).all()
    return shelves


@router.get("/{shelf_id}", response_model=ShelfWithBooks)
def get_shelf(
    shelf_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()

    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your shelf")

    book_ids = db.query(ShelfBook.book_id).filter(ShelfBook.shelf_id == shelf_id).all()
    book_ids = [b[0] for b in book_ids]
    books = db.query(Book).filter(Book.id.in_(book_ids)).all()

    shelf_data = ShelfOut.model_validate(shelf).model_dump()
    shelf_data["books"] = books

    return shelf_data


@router.post("/{shelf_id}/books/{book_id}", status_code=status.HTTP_201_CREATED)
def add_book_to_shelf(
    shelf_id: int,
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your shelf")

    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your book")

    existing = db.query(ShelfBook).filter(
        ShelfBook.shelf_id == shelf_id,
        ShelfBook.book_id == book_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Book already on this shelf")

    shelf_book = ShelfBook(shelf_id=shelf_id, book_id=book_id)
    db.add(shelf_book)
    db.commit()

    return {"message": "Book added to shelf"}


@router.delete("/{shelf_id}/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_book_from_shelf(
    shelf_id: int,
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your shelf")

    shelf_book = db.query(ShelfBook).filter(
        ShelfBook.shelf_id == shelf_id,
        ShelfBook.book_id == book_id
    ).first()

    if not shelf_book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book is not on this shelf")

    db.delete(shelf_book)
    db.commit()

    return None


@router.delete("/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shelf(
    shelf_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()

    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your shelf")

    db.query(ShelfBook).filter(ShelfBook.shelf_id == shelf_id).delete()
    db.delete(shelf)
    db.commit()

    return None
