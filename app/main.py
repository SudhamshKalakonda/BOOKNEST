from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine
from app.routers import auth, books, shelves, lending, activity, websocket

app = FastAPI()

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(shelves.router)
app.include_router(lending.router)
app.include_router(activity.router)
app.include_router(websocket.router)

@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "db": "connected"}
