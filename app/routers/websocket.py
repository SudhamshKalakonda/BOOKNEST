from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.auth.jwt import decode_token
from app.services.connection_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    db: Session = SessionLocal()

    try:
        payload = decode_token(token)
    except ValueError:
        await websocket.close(code=1008)
        db.close()
        return

    if payload.get("type") != "access":
        await websocket.close(code=1008)
        db.close()
        return

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        await websocket.close(code=1008)
        db.close()
        return

    db.close()

    await manager.connect(user_id, websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
