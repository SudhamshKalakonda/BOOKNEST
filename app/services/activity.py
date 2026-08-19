from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog


def log_activity(
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
