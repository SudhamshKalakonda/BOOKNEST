from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
from app.models.shelf import Shelf
from app.models.shelf_share import ShelfShare
from app.services.connection_manager import manager


async def log_activity(
    db: Session,
    actor_id: int,
    event_type: str,
    message: str,
    shelf_id: int | None = None,
    book_id: int | None = None,
):
    entry = ActivityLog(
        actor_id=actor_id,
        event_type=event_type,
        message=message,
        shelf_id=shelf_id,
        book_id=book_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    recipient_ids = {actor_id}

    if shelf_id is not None:
        shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
        if shelf:
            recipient_ids.add(shelf.owner_id)
            shares = db.query(ShelfShare).filter(ShelfShare.shelf_id == shelf_id).all()
            for share in shares:
                recipient_ids.add(share.user_id)

    await manager.send_to_users(list(recipient_ids), {
        "type": "activity",
        "event_type": entry.event_type,
        "message": entry.message,
        "shelf_id": entry.shelf_id,
        "book_id": entry.book_id,
        "created_at": entry.created_at.isoformat(),
    })
