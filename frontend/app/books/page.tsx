"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import Nav from "@/components/Nav";

type Book = {
  id: number;
  title: string;
  author: string;
  status: string;
  total_pages: number | null;
  current_page: number | null;
  rating: number | null;
  notes: string | null;
  lent_to_id: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
};

const STATUS_OPTIONS = ["want_to_read", "reading", "finished"];
const PAGE_SIZE = 6;

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editCurrentPage, setEditCurrentPage] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [lendingId, setLendingId] = useState<number | null>(null);
  const [lendEmail, setLendEmail] = useState("");
  const [lendError, setLendError] = useState("");
  const [lendSubmitting, setLendSubmitting] = useState(false);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status_filter", statusFilter);
      if (search) params.set("search", search);
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));

      const res = await authFetch(`/books/?${params.toString()}`);
      if (!res.ok) {
        setError("Could not load your books.");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setBooks(json);
      setLoading(false);
    } catch {
      setError("Could not reach the server.");
      setLoading(false);
    }
  }, [statusFilter, search, sortBy, sortOrder, page]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadBooks();
  }, [router, loadBooks]);

  async function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await authFetch("/books/", {
        method: "POST",
        body: JSON.stringify({
          title,
          author,
          status: "want_to_read",
          total_pages: totalPages ? parseInt(totalPages) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(typeof data.detail === "string" ? data.detail : "Could not add book.");
        setSubmitting(false);
        return;
      }

      setTitle("");
      setAuthor("");
      setTotalPages("");
      setShowForm(false);
      setSubmitting(false);
      setPage(1);
      loadBooks();
    } catch {
      setFormError("Could not reach the server.");
      setSubmitting(false);
    }
  }

  function startEdit(book: Book) {
    setEditingId(book.id);
    setEditStatus(book.status);
    setEditCurrentPage(book.current_page != null ? String(book.current_page) : "");
    setEditRating(book.rating != null ? String(book.rating) : "");
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveEdit(bookId: number) {
    setEditError("");
    setEditSubmitting(true);

    const payload: Record<string, unknown> = { status: editStatus };
    payload.current_page = editCurrentPage ? parseInt(editCurrentPage) : null;
    payload.rating = editRating ? parseInt(editRating) : null;

    try {
      const res = await authFetch(`/books/${bookId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditError(typeof data.detail === "string" ? data.detail : "Could not update book.");
        setEditSubmitting(false);
        return;
      }

      setEditingId(null);
      setEditSubmitting(false);
      loadBooks();
    } catch {
      setEditError("Could not reach the server.");
      setEditSubmitting(false);
    }
  }

  async function handleDelete(bookId: number) {
    setDeletingId(bookId);
    try {
      const res = await authFetch(`/books/${bookId}`, { method: "DELETE" });
      if (res.ok) {
        loadBooks();
      }
    } finally {
      setDeletingId(null);
    }
  }

  function startLend(bookId: number) {
    setLendingId(bookId);
    setLendEmail("");
    setLendError("");
  }

  async function handleLendSubmit(bookId: number) {
    setLendError("");
    setLendSubmitting(true);
    try {
      const res = await authFetch(`/lending/${bookId}/lend`, {
        method: "POST",
        body: JSON.stringify({ borrower_email: lendEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLendError(typeof data.detail === "string" ? data.detail : "Could not lend book.");
        setLendSubmitting(false);
        return;
      }
      setLendingId(null);
      setLendSubmitting(false);
      loadBooks();
    } catch {
      setLendError("Could not reach the server.");
      setLendSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-coral/10 pointer-events-none" />

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <Nav />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-4xl text-ink mb-1">My Books</h1>
            <p className="text-ink/50 text-sm">Everything you&apos;re reading, and everything you plan to.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-coral text-off-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-coral-dark transition-colors"
          >
            {showForm ? "Cancel" : "+ Add book"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddBook}
            className="bg-charcoal rounded-2xl p-6 mb-8 flex flex-col gap-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                  Title
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                  Author
                </label>
                <input
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral"
                />
              </div>
            </div>
            <div className="sm:w-1/2">
              <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                Total pages (optional)
              </label>
              <input
                type="number"
                min="1"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            {formError && (
              <div className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-xl px-4 py-2.5">
                {formError}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="self-start bg-coral text-off-white font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-coral-dark transition-colors disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add book"}
            </button>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search title or author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-full border-2 border-charcoal bg-off-white text-sm outline-none focus:ring-2 focus:ring-coral min-w-[220px]"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-full border-2 border-charcoal bg-off-white text-sm outline-none"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-full border-2 border-charcoal bg-off-white text-sm outline-none"
          >
            <option value="created_at">Date added</option>
            <option value="title">Title</option>
            <option value="rating">Rating</option>
          </select>

          <button
            onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            className="px-4 py-2 rounded-full border-2 border-charcoal bg-off-white text-sm"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>

        {loading && <p className="text-ink/50 text-sm">Loading your books...</p>}

        {error && (
          <div className="text-center py-8">
            <p className="text-coral mb-2 font-medium">{error}</p>
            <button onClick={loadBooks} className="text-sm text-charcoal underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="text-center py-16">
            <p className="text-ink/50">No books match your filters.</p>
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-off-white border-2 border-charcoal rounded-2xl p-5 flex flex-col"
              >
                {editingId === book.id ? (
                  <div className="flex flex-col gap-3">
                    <h3 className="font-display font-bold text-base text-ink leading-tight">
                      {book.title}
                    </h3>

                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-ink/50 mb-1">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-charcoal bg-cream text-sm outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {book.total_pages && (
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-ink/50 mb-1">
                          Current page (of {book.total_pages})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editCurrentPage}
                          onChange={(e) => setEditCurrentPage(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border-2 border-charcoal bg-cream text-sm outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-ink/50 mb-1">
                        Rating (1-5)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editRating}
                        onChange={(e) => setEditRating(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-charcoal bg-cream text-sm outline-none"
                      />
                    </div>

                    {editError && (
                      <div className="text-xs text-coral bg-coral/10 border border-coral/30 rounded-lg px-3 py-2">
                        {editError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(book.id)}
                        disabled={editSubmitting}
                        className="flex-1 bg-coral text-off-white font-semibold text-xs py-2 rounded-full disabled:opacity-60"
                      >
                        {editSubmitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 border-2 border-charcoal text-ink font-semibold text-xs py-2 rounded-full"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-coral bg-coral/10 rounded-full px-2.5 py-1">
                        {STATUS_LABELS[book.status] || book.status}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(book)}
                          className="text-xs text-ink/40 hover:text-ink w-6 h-6 flex items-center justify-center rounded-full hover:bg-charcoal/5"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          disabled={deletingId === book.id}
                          className="text-xs text-ink/40 hover:text-coral w-6 h-6 flex items-center justify-center rounded-full hover:bg-coral/5 disabled:opacity-40"
                          title="Delete"
                        >
                          {deletingId === book.id ? "..." : "✕"}
                        </button>
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-lg text-ink leading-tight">{book.title}</h3>
                    <p className="text-sm text-ink/50 mb-3">{book.author}</p>
                    {book.total_pages && (
                      <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-coral rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              ((book.current_page || 0) / book.total_pages) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                    {book.total_pages && (
                      <p className="text-xs text-ink/40">
                        {book.current_page || 0} / {book.total_pages} pages
                      </p>
                    )}
                    {book.rating && (
                      <p className="text-coral text-sm mt-2">{"★".repeat(book.rating)}</p>
                    )}

                    {book.lent_to_id ? (
                      <span className="inline-block mt-3 text-[11px] font-semibold uppercase tracking-wider text-coral bg-coral/10 rounded-full px-2.5 py-1 self-start">
                        Lent out
                      </span>
                    ) : lendingId === book.id ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <input
                          type="email"
                          placeholder="borrower@example.com"
                          value={lendEmail}
                          onChange={(e) => setLendEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border-2 border-charcoal bg-cream text-xs outline-none"
                        />
                        {lendError && (
                          <div className="text-[11px] text-coral bg-coral/10 border border-coral/30 rounded-lg px-2 py-1.5">
                            {lendError}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLendSubmit(book.id)}
                            disabled={lendSubmitting}
                            className="flex-1 bg-coral text-off-white font-semibold text-xs py-1.5 rounded-full disabled:opacity-60"
                          >
                            {lendSubmitting ? "Lending..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setLendingId(null)}
                            className="flex-1 border-2 border-charcoal text-ink font-semibold text-xs py-1.5 rounded-full"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startLend(book.id)}
                        className="mt-3 text-xs font-medium text-ink/50 hover:text-coral underline self-start"
                      >
                        Lend this book
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-full border-2 border-charcoal text-sm disabled:opacity-30"
            >
              &larr; Prev
            </button>
            <span className="text-sm text-ink/50">Page {page}</span>
            <button
              onClick={() => setPage((p) => (books.length < PAGE_SIZE ? p : p + 1))}
              disabled={books.length < PAGE_SIZE}
              className="px-4 py-2 rounded-full border-2 border-charcoal text-sm disabled:opacity-30"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
