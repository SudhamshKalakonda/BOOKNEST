from sqlalchemy.orm import Session
from app.models.shelf import Shelf
from app.models.shelf_share import ShelfShare


def get_shelf_role(db: Session, shelf: Shelf, user_id: int) -> str | None:
    if shelf.owner_id == user_id:
        return "owner"

    share = db.query(ShelfShare).filter(
        ShelfShare.shelf_id == shelf.id,
        ShelfShare.user_id == user_id
    ).first()

    if share:
        return share.role

    return None
