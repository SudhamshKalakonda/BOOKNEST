"""
Seed script for BookNest.

Creates two test users, sample books, shelves, one shelf shared as editor,
one shelf shared as viewer, and one active lending — so the app can be
explored immediately after a clean clone.

Run with: ./venv/bin/python seed.py
"""

from datetime import datetime, timezone
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.book import Book
from app.models.shelf import Shelf
from app.models.shelf_book import ShelfBook
from app.models.shelf_share import ShelfShare
from app.models.activity_log import ActivityLog
from app.auth.security import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("Seeding BookNest...")

existing = db.query(User).filter(User.email == "alice@example.com").first()
if existing:
    print("Seed data already exists (alice@example.com found). Skipping.")
    db.close()
    exit()

alice = User(
    name="Alice Carter",
    email="alice@example.com",
    password_hash=hash_password("AlicePass123"),
)
bob = User(
    name="Bob Nguyen",
    email="bob@example.com",
    password_hash=hash_password("BobPass123"),
)
db.add_all([alice, bob])
db.commit()
db.refresh(alice)
db.refresh(bob)
print(f"Created users: {alice.email} (id={alice.id}), {bob.email} (id={bob.id})")

alice_books = [
    Book(owner_id=alice.id, title="Dune", author="Frank Herbert", status="finished",
         total_pages=412, current_page=412, rating=5, finished_at=datetime.now(timezone.utc)),
    Book(owner_id=alice.id, title="Project Hail Mary", author="Andy Weir", status="reading",
         total_pages=476, current_page=210),
    Book(owner_id=alice.id, title="The Midnight Library", author="Matt Haig", status="want_to_read",
         total_pages=288),
]
bob_books = [
    Book(owner_id=bob.id, title="Sapiens", author="Yuval Noah Harari", status="finished",
         total_pages=443, current_page=443, rating=4, finished_at=datetime.now(timezone.utc)),
    Book(owner_id=bob.id, title="Atomic Habits", author="James Clear", status="reading",
         total_pages=320, current_page=150),
]
db.add_all(alice_books + bob_books)
db.commit()
for b in alice_books + bob_books:
    db.refresh(b)
print(f"Created {len(alice_books)} books for Alice, {len(bob_books)} books for Bob")

sci_fi_shelf = Shelf(owner_id=alice.id, name="Sci-Fi Favorites")
nonfiction_shelf = Shelf(owner_id=alice.id, name="Nonfiction")
db.add_all([sci_fi_shelf, nonfiction_shelf])
db.commit()
db.refresh(sci_fi_shelf)
db.refresh(nonfiction_shelf)
print(f"Created shelves: '{sci_fi_shelf.name}', '{nonfiction_shelf.name}' (owned by Alice)")

db.add_all([
    ShelfBook(shelf_id=sci_fi_shelf.id, book_id=alice_books[0].id),
    ShelfBook(shelf_id=sci_fi_shelf.id, book_id=alice_books[1].id),
])
db.commit()
print("Added books to Sci-Fi Favorites shelf")

db.add_all([
    ShelfShare(shelf_id=sci_fi_shelf.id, user_id=bob.id, role="editor"),
    ShelfShare(shelf_id=nonfiction_shelf.id, user_id=bob.id, role="viewer"),
])
db.commit()
print("Shared 'Sci-Fi Favorites' with Bob as editor")
print("Shared 'Nonfiction' with Bob as viewer")

bob_books[0].lent_to_id = alice.id
db.commit()
print(f"Bob lent '{bob_books[0].title}' to Alice")

db.add_all([
    ActivityLog(actor_id=alice.id, event_type="book_added",
                message=f"Alice Carter added \"{alice_books[0].title}\"", book_id=alice_books[0].id),
    ActivityLog(actor_id=alice.id, event_type="shelf_shared",
                message=f"Alice Carter shared \"{sci_fi_shelf.name}\" with Bob Nguyen as editor",
                shelf_id=sci_fi_shelf.id),
    ActivityLog(actor_id=bob.id, event_type="book_lent",
                message=f"Bob Nguyen lent \"{bob_books[0].title}\" to Alice Carter", book_id=bob_books[0].id),
])
db.commit()
print("Created sample activity log entries")

db.close()

print()
print("Seed complete. Test accounts:")
print("  alice@example.com / AlicePass123  (owns Sci-Fi Favorites, Nonfiction; borrowing Sapiens from Bob)")
print("  bob@example.com   / BobPass123    (editor on Sci-Fi Favorites, viewer on Nonfiction; lent Sapiens to Alice)")
