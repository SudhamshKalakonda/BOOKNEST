"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import Nav from "@/components/Nav";

type Book = {
  id: number;
  title: string;
  author: string;
  status: string;
};

type ShelfDetail = {
  id: number;
  name: string;
  owner_id: number;
  books: Book[];
};

export default function ShelfDetailPage() {
  const router = useRouter();
  const params = useParams();
  const shelfId = params.id as string;

  const [shelf, setShelf] = useState<ShelfDetail | null>(null);
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [showAddBook, setShowAddBook] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [shareError, setShareError] = useState("");
  const [shareSubmitting, setShareSubmitting] = useState(false);

  const loadShelf = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const res = await authFetch(`/shelves/${shelfId}`);
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setError("Shelf not found.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Could not load this shelf.");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setShelf(json);
      setLoading(false);
    } catch {
      setError("Could not reach the server.");
      setLoading(false);
    }
  }, [shelfId]);

  const loadMyBooks = useCallback(async () => {
    try {
      const res = await authFetch("/books/?page_size=100");
      if (res.ok) {
        setMyBooks(await res.json());
      }
    } catch {
      // silent - not critical for page to function
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadShelf();
    loadMyBooks();
  }, [router, loadShelf, loadMyBooks]);

  async function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!selectedBookId) return;
    setAddSubmitting(true);

    try {
      const res = await authFetch(`/shelves/${shelfId}/books/${selectedBookId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setAddError(typeof data.detail === "string" ? data.detail : "Could not add book.");
        setAddSubmitting(false);
        return;
      }

      setSelectedBookId("");
      setShowAddBook(false);
      setAddSubmitting(false);
      loadShelf();
    } catch {
      setAddError("Could not reach the server.");
      setAddSubmitting(false);
    }
  }

  async function handleRemoveBook(bookId: number) {
    try {
      const res = await authFetch(`/shelves/${shelfId}/books/${bookId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadShelf();
      }
    } catch {
      // no-op
    }
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setShareError("");
    setShareSubmitting(true);

    try {
      const res = await authFetch(`/shelves/${shelfId}/share`, {
        method: "POST",
        body: JSON.stringify({ email: shareEmail, role: shareRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setShareError(typeof data.detail === "string" ? data.detail : "Could not share shelf.");
        setShareSubmitting(false);
        return;
      }

      setShareEmail("");
      setShareSubmitting(false);
      setShowShare(false);
    } catch {
      setShareError("Could not reach the server.");
      setShareSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-ink/50 text-sm">Loading shelf...</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-coral font-medium mb-2">You don&apos;t have access to this shelf.</p>
          <a href="/shelves" className="text-sm text-charcoal underline">
            Back to shelves
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-coral font-medium mb-2">{error}</p>
          <button onClick={loadShelf} className="text-sm text-charcoal underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!shelf) return null;

  const booksNotOnShelf = myBooks.filter(
    (b) => !shelf.books.some((sb) => sb.id === b.id)
  );

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-coral/10 pointer-events-none" />

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <Nav />

        <a href="/shelves" className="text-sm font-medium text-ink/50 hover:text-ink mb-4 inline-block">
          &larr; All shelves
        </a>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display font-bold text-4xl text-ink">{shelf.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddBook((v) => !v)}
              className="bg-coral text-off-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-coral-dark transition-colors"
            >
              {showAddBook ? "Cancel" : "+ Add book"}
            </button>
            <button
              onClick={() => setShowShare((v) => !v)}
              className="border-2 border-charcoal text-ink font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-charcoal hover:text-off-white transition-colors"
            >
              {showShare ? "Cancel" : "Share"}
            </button>
          </div>
        </div>

        {showAddBook && (
          <form onSubmit={handleAddBook} className="bg-charcoal rounded-2xl p-6 mb-8 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                Choose one of your books
              </label>
              <select
                required
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral"
              >
                <option value="">Select a book...</option>
                {booksNotOnShelf.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>
            </div>
            {addError && (
              <div className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-xl px-4 py-2.5">
                {addError}
              </div>
            )}
            <button
              type="submit"
              disabled={addSubmitting}
              className="self-start bg-coral text-off-white font-semibold text-sm px-6 py-2.5 rounded-full disabled:opacity-60"
            >
              {addSubmitting ? "Adding..." : "Add to shelf"}
            </button>
          </form>
        )}

        {showShare && (
          <form onSubmit={handleShare} className="bg-charcoal rounded-2xl p-6 mb-8 flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                  Share with (email)
                </label>
                <input
                  required
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                  Role
                </label>
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none"
                >
                  <option value="viewer">Viewer (can see only)</option>
                  <option value="editor">Editor (can add/remove books)</option>
                </select>
              </div>
            </div>
            {shareError && (
              <div className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-xl px-4 py-2.5">
                {shareError}
              </div>
            )}
            <button
              type="submit"
              disabled={shareSubmitting}
              className="self-start bg-coral text-off-white font-semibold text-sm px-6 py-2.5 rounded-full disabled:opacity-60"
            >
              {shareSubmitting ? "Sharing..." : "Share shelf"}
            </button>
          </form>
        )}

        {shelf.books.length === 0 ? (
          <p className="text-ink/50 text-sm">No books on this shelf yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shelf.books.map((book) => (
              <div key={book.id} className="bg-off-white border-2 border-charcoal rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-bold text-lg text-ink leading-tight">{book.title}</h3>
                  <button
                    onClick={() => handleRemoveBook(book.id)}
                    className="text-xs text-ink/40 hover:text-coral w-6 h-6 flex items-center justify-center rounded-full hover:bg-coral/5 flex-shrink-0"
                    title="Remove from shelf"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-ink/50">{book.author}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
