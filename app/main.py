from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from app.routers import auth, books, shelves, lending, activity, websocket, dashboard

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(shelves.router)
app.include_router(lending.router)
app.include_router(activity.router)
app.include_router(websocket.router)
app.include_router(dashboard.router)

@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "db": "connected"}
