from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.shelf import Shelf
from app.models.shelf_book import ShelfBook
from app.models.shelf_share import ShelfShare
from app.models.book import Book
from app.models.user import User
from app.schemas.shelf import ShelfCreate, ShelfOut, ShelfWithBooks
from app.schemas.shelf_share import (
    ShelfShareCreate,
    ShelfShareRoleUpdate,
    ShelfShareOut,
    SharedShelfOut,
)
from app.auth.dependencies import get_current_user
from app.auth.shelf_permissions import get_shelf_role

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


@router.get("/shared-with-me", response_model=List[SharedShelfOut])
def shared_with_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shares = db.query(ShelfShare).filter(ShelfShare.user_id == current_user.id).all()

    result = []
    for share in shares:
        shelf = db.query(Shelf).filter(Shelf.id == share.shelf_id).first()
        if shelf:
            result.append(SharedShelfOut(
                id=shelf.id,
                name=shelf.name,
                owner_id=shelf.owner_id,
                role=share.role,
            ))
    return result


@router.get("/{shelf_id}", response_model=ShelfWithBooks)
def get_shelf(
    shelf_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    role = get_shelf_role(db, shelf, current_user.id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this shelf")

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

    role = get_shelf_role(db, shelf, current_user.id)
    if role not in ("owner", "editor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to add books to this shelf")

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

    role = get_shelf_role(db, shelf, current_user.id)
    if role not in ("owner", "editor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to remove books from this shelf")

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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete this shelf")

    db.query(ShelfShare).filter(ShelfShare.shelf_id == shelf_id).delete()
    db.query(ShelfBook).filter(ShelfBook.shelf_id == shelf_id).delete()
    db.delete(shelf)
    db.commit()

    return None


@router.post("/{shelf_id}/share", response_model=ShelfShareOut, status_code=status.HTTP_201_CREATED)
def share_shelf(
    shelf_id: int,
    payload: ShelfShareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can share this shelf")

    target_user = db.query(User).filter(User.email == payload.email).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No registered user with that email")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot share a shelf with yourself")

    existing = db.query(ShelfShare).filter(
        ShelfShare.shelf_id == shelf_id,
        ShelfShare.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shelf is already shared with this user")

    new_share = ShelfShare(shelf_id=shelf_id, user_id=target_user.id, role=payload.role.value)
    db.add(new_share)
    db.commit()
    db.refresh(new_share)

    return new_share


@router.put("/{shelf_id}/share/{user_id}", response_model=ShelfShareOut)
def update_collaborator_role(
    shelf_id: int,
    user_id: int,
    payload: ShelfShareRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can change roles")

    share = db.query(ShelfShare).filter(
        ShelfShare.shelf_id == shelf_id,
        ShelfShare.user_id == user_id
    ).first()
    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This user does not have access to this shelf")

    share.role = payload.role.value
    db.commit()
    db.refresh(share)

    return share


@router.delete("/{shelf_id}/share/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_collaborator(
    shelf_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf not found")

    if shelf.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can remove a collaborator")

    share = db.query(ShelfShare).filter(
        ShelfShare.shelf_id == shelf_id,
        ShelfShare.user_id == user_id
    ).first()
    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This user does not have access to this shelf")

    db.delete(share)
    db.commit()

    return None
