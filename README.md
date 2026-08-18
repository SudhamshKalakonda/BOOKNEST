# BookNest

A reading-tracker app where users manage books, organize them into shelves, share shelves with other users under role-based permissions, log reading progress, and lend books to other users.

## Status

Work in progress. Currently implemented:

- **Auth**: signup, login, logout, JWT access + refresh token flow with refresh token rotation and DB-backed revocation
- **Books**: create, list, update, delete, combined filter + search, server-side pagination + sorting, reading progress validation, auto-finish on completion

Not yet implemented: shelves, shelf sharing/roles, lending, activity log, WebSockets, dashboard.

## Stack

- **Backend**: Python, FastAPI
- **Database**: PostgreSQL
- **ORM / migrations**: SQLAlchemy + Alembic
- **Auth**: JWT (python-jose), bcrypt password hashing (passlib)

## Setup (local)

1. Install PostgreSQL and create a database:
   ```bash
   createdb booknest
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and fill in real values:
   ```bash
   cp .env.example .env
   ```

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```

5. Start the server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

6. Visit `http://127.0.0.1:8000/docs` for interactive API docs.

## More documentation coming

Data model, refresh-token flow details, RBAC design, and WebSocket setup will be documented here as those pieces are built.
