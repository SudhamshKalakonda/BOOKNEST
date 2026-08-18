from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine
from app.routers import auth, books

app = FastAPI()

app.include_router(auth.router)
app.include_router(books.router)

@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "db": "connected"}