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
};

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
};

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/books/");
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
  }, []);

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
      loadBooks();
    } catch {
      setFormError("Could not reach the server.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-coral/10 pointer-events-none" />

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <Nav />

        <div className="flex items-center justify-between mb-6">
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
            <p className="text-ink/50">No books yet. Add your first one to get started.</p>
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-off-white border-2 border-charcoal rounded-2xl p-5"
              >
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-coral bg-coral/10 rounded-full px-2.5 py-1 mb-3">
                  {STATUS_LABELS[book.status] || book.status}
                </span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
