# BookNest

A reading-tracker app where users manage books, organize them into custom shelves, share shelves with other users under role-based permissions, log reading progress, and lend books to other users on the platform. Includes real-time updates over WebSockets, an activity feed, and a dashboard with reading stats.

## How to run it (clean clone)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # on Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create the database (requires PostgreSQL installed and running)
createdb booknest

cp .env.example .env
# Edit .env and set DATABASE_URL and JWT_SECRET

alembic upgrade head

# Optional but recommended: populate with test data
python seed.py

uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Interactive API docs at `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### Test accounts (after running `seed.py`)

| Email | Password | Notes |
|---|---|---|
| `alice@example.com` | `AlicePass123` | Owns two shelves, one shared as editor with Bob, one as viewer. Currently borrowing a book from Bob. |
| `bob@example.com` | `BobPass123` | Editor on one of Alice's shelves, viewer on another. Has lent a book to Alice. |

## Stack and why

- **Backend:** Python + FastAPI — fast to build with, native async support (needed for WebSockets), automatic OpenAPI docs which made manual testing during development much faster.
- **Database:** PostgreSQL — real relational integrity for the many-to-many relationships (books↔shelves, shelves↔users) and foreign key constraints that catch bugs early (this actually caught a real bug during development — see "What was hard" below).
- **ORM / migrations:** SQLAlchemy + Alembic — explicit, version-controlled schema changes rather than hand-editing the database.
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS — component-based UI, fast dev loop, and Tailwind kept styling consistent across many screens without writing custom CSS per component.
- **Auth:** JWT via `python-jose`, password hashing via `passlib`/`bcrypt`.
- **Real-time:** native WebSockets via FastAPI/Starlette — no external service needed, and it integrates directly with the existing JWT auth.

## Data model

Seven tables:

- **User** — id, name, email (unique), password_hash, created_at
- **Book** — id, owner_id (→User), title, author, status, total_pages, current_page, rating, notes, finished_at, lent_to_id (→User, nullable), created_at
- **Shelf** — id, owner_id (→User), name, created_at
- **ShelfBook** — bridge table for the book↔shelf many-to-many relationship (shelf_id, book_id)
- **ShelfShare** — bridge table for shelf sharing, carries the collaborator's role (shelf_id, user_id, role: "editor" | "viewer")
- **ActivityLog** — id, actor_id (→User, who performed the action), event_type, message, shelf_id (nullable), book_id (nullable), created_at
- **RefreshToken** — id, user_id (→User), token_hash, expires_at, revoked, created_at

**Relationships:**
- A User owns many Books and many Shelves.
- A Book can belong to many Shelves, and a Shelf can hold many Books — modeled through the `ShelfBook` bridge table rather than a foreign key on either side, since neither table can hold a list of the other.
- A Shelf can be shared with many Users, each with their own role — modeled through `ShelfShare`, which is a bridge table that also carries data (the role) beyond just the two IDs it connects.
- Lending is modeled as a single nullable `lent_to_id` column directly on `Book`, rather than a separate table — a book can only be lent to one person at a time, so there's no many-to-many relationship to model here, just an optional pointer to the current borrower.
- `ActivityLog` stores who performed an action (`actor_id`) and optionally which shelf or book it relates to. **Who gets to see an event is computed at read time**, not stored: the actor always sees their own events, and if the event relates to a shelf, everyone with access to that shelf (owner + all collaborators) sees it too. This is the same logic reused for WebSocket event scoping (see below).

Deleting a Shelf removes its `ShelfBook` and `ShelfShare` rows but never touches the Books themselves. Deleting a Book removes its `ShelfBook` rows and nulls out any `ActivityLog.book_id` references to it (the log message text still reads correctly since the book title is baked into the message string, not looked up live).

## Refresh-token flow

- **Access token:** short-lived (15 minutes), JWT, sent in the `Authorization: Bearer` header on every request. Stored in the frontend's `localStorage`.
- **Refresh token:** longer-lived (7 days), JWT, sent as an **httpOnly cookie** — JavaScript cannot read it, which protects it from XSS. The browser sends it automatically on requests to the backend; the frontend code never touches its value directly.
- On login, both tokens are issued. The refresh token is also **hashed and stored in the database** (`RefreshToken` table), so it can be revoked before its natural expiry — a plain stateless JWT can't be "un-signed" early, but a database flag can be flipped instantly.
- **Refresh flow:** when an API call returns 401 (expired access token), the frontend automatically calls `/auth/refresh` (the cookie is sent automatically by the browser), receives a new access token, and retries the original request — transparent to the user.
- **Token rotation:** every successful refresh issues a brand-new refresh token and revokes the old one. This means a stolen refresh token becomes useless the next time the real user refreshes normally.
- **Logout** revokes the current refresh token in the database and clears the cookie.

## RBAC enforcement (shelf roles)

Three roles: **owner** (the creator), **editor**, **viewer** — the latter two assigned via `ShelfShare`.

A single helper function, `get_shelf_role(db, shelf, user_id)`, is called at the start of every shelf-related route. It returns `"owner"`, `"editor"`, `"viewer"`, or `None` (no access), and every route branches on that return value rather than re-implementing the check:

- Viewing a shelf: any role (owner/editor/viewer) is allowed; `None` gets a 403.
- Adding/removing books on a shelf: only `"owner"` or `"editor"` is allowed; a viewer gets a 403.
- Sharing, changing a collaborator's role, removing a collaborator, deleting the shelf: **only** `"owner"` — even an editor gets a 403.

This is enforced entirely in the route handlers on the backend, not by hiding UI buttons — a viewer calling the "add book" endpoint directly (e.g. with curl or Postman) is rejected the same way a browser click would be. This was directly tested during development: logging in as a viewer and calling the endpoint by hand returns a clear 403 with a message explaining why.

## WebSocket design

- **Authentication:** the frontend connects to `/ws?token=<access_token>` — the JWT is passed as a query parameter (browsers' native WebSocket API doesn't support custom headers on the initial handshake). The server decodes and verifies the token exactly the same way it does for regular HTTP requests, and closes the connection immediately (code 1008) if the token is invalid, expired, or not an access token.
- **Connection tracking:** an in-memory `ConnectionManager` maps `user_id → [open connections]` (a list, since one user can have multiple tabs/devices open at once).
- **Scoping events to the right people:** rather than broadcasting to everyone, each event computes its actual audience before sending:
  - Lending events (book lent/returned) are sent only to the borrower.
  - Shelf events (book added/removed) are sent to the shelf's owner and all of its collaborators, excluding whoever just performed the action.
  - Activity feed events reuse the same "actor + shelf owner + shelf collaborators" rule used for the read-side activity feed query, so what shows up live matches exactly what would show up on a manual refresh.
- **Disconnect handling:** the server detects a dropped connection via `WebSocketDisconnect` and removes it from the in-memory map. Because the app never depends on the socket being open — all real data lives in Postgres and is fetched over normal REST calls — a dropped connection doesn't break anything; the user simply stops receiving live pushes until they reconnect (which happens automatically the next time they load a page, since a new socket connection is opened on each page load in the current implementation).

## What was hard

- **Getting the many-to-many relationships right conceptually** before writing any code — understanding why `ShelfBook` and `ShelfShare` needed to be their own tables rather than foreign keys on an existing table, especially since `ShelfShare` also had to carry the `role` column.
- **A real foreign-key bug caught by Postgres itself:** deleting a book initially only cleaned up its `ShelfBook` rows, not its `ActivityLog` references, so Postgres correctly rejected the delete with a `ForeignKeyViolation`. This was found through manual testing on the frontend, not written into the design up front — a good example of the database's own integrity constraints catching a real application bug.
- **WebSocket authentication and scoping** — the pattern of "who should receive this event" needed to be computed consistently in three different places (the REST activity feed query, the WebSocket activity push, and the shelf collaboration push), and getting that logic to actually match across all three took careful testing with two simultaneous browser sessions.
- **Local environment issues** unrelated to the app's logic: a conda/venv PATH conflict repeatedly caused `uvicorn` to load the wrong Python interpreter (missing `psycopg2`), which had to be worked around by invoking `./venv/bin/python` directly instead of relying on `python` resolving correctly after `source venv/bin/activate`.

## Known issues / incomplete

- The dashboard's live activity feed and the shelf detail page's live book add/remove notifications are wired up and working, but not every screen listens for every possible event type (e.g. My Books doesn't live-update if a book is edited from another session).
- No automated tests were added (listed as an optional stretch goal in the assignment).
- Not Dockerized.
- The access token is stored in `localStorage` rather than kept purely in memory; a stricter implementation would avoid persisting it to storage at all, at the cost of losing the session on every page refresh.
- A new WebSocket connection is opened on each page load rather than being shared/persisted across navigation within the app, which is simple and reliable but slightly wasteful.

## What I'd improve with more time

- Extend live WebSocket updates to every screen (My Books, Borrowed) for full real-time coverage, not just Dashboard and Shelf detail.
- Add automated tests for the highest-risk paths: auth (login/refresh/logout), lending rules (double-lend, self-lend), and RBAC (viewer rejection on write endpoints).
- Move the access token out of `localStorage` into pure in-memory state.
- Share a single WebSocket connection across the app (e.g. via React context) instead of opening a new one per page.
- Dockerize both services with a single `docker-compose up`.

## Where I used AI

I used Claude throughout this project as a hands-on pair-programming partner: designing the data model before writing code, explaining unfamiliar concepts (JWT refresh rotation, many-to-many bridge tables, WebSocket authentication) before implementation, and working through debugging step by step rather than having code generated and pasted blindly. Every backend phase (auth, books, shelves, RBAC, lending, activity log, WebSockets, dashboard) was built incrementally and tested against the real API after each piece, and I can walk through and explain the reasoning behind each design decision — the choice to model lending as a nullable column instead of a table, why the refresh token is hashed before storage, why permission checks live in one reusable helper function instead of being copy-pasted per route, and how WebSocket event scoping reuses the same audience-computation logic as the REST activity feed.

What I learned: the practical mechanics of JWT refresh-token rotation and why it matters (a stolen token becomes useless after the legitimate user's next refresh), how to model and query many-to-many relationships correctly in SQLAlchemy, how to structure backend permission logic so it can't be bypassed by direct API calls, and how to authenticate and scope WebSocket connections using the same JWT infrastructure as the REST API.
