from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from app.database import get_db
from app.models.activity_log import ActivityLog
from app.models.shelf import Shelf
from app.models.shelf_share import ShelfShare
from app.models.user import User
from app.schemas.activity import ActivityLogOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/", response_model=List[ActivityLogOut])
def get_activity_feed(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_shelf_ids = [
        row[0] for row in db.query(Shelf.id).filter(Shelf.owner_id == current_user.id).all()
    ]
    shared_shelf_ids = [
        row[0] for row in db.query(ShelfShare.shelf_id).filter(ShelfShare.user_id == current_user.id).all()
    ]
    visible_shelf_ids = list(set(owned_shelf_ids + shared_shelf_ids))

    query = db.query(ActivityLog).filter(
        or_(
            ActivityLog.actor_id == current_user.id,
            ActivityLog.shelf_id.in_(visible_shelf_ids) if visible_shelf_ids else False,
        )
    )

    entries = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return entries
