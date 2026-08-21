"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import Nav from "@/components/Nav";

type BorrowedBook = {
  id: number;
  title: string;
  author: string;
  status: string;
};

type MyBook = {
  id: number;
  title: string;
  author: string;
  lent_to_id: number | null;
};

export default function BorrowedPage() {
  const router = useRouter();
  const [borrowed, setBorrowed] = useState<BorrowedBook[]>([]);
  const [lentOut, setLentOut] = useState<MyBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returningId, setReturningId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [borrowedRes, booksRes] = await Promise.all([
        authFetch("/lending/borrowed"),
        authFetch("/books/?page_size=100"),
      ]);

      if (!borrowedRes.ok || !booksRes.ok) {
        setError("Could not load your lending info.");
        setLoading(false);
        return;
      }

      setBorrowed(await borrowedRes.json());
      const allBooks: MyBook[] = await booksRes.json();
      setLentOut(allBooks.filter((b) => b.lent_to_id !== null));
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
    loadData();
  }, [router, loadData]);

  async function handleReturn(bookId: number) {
    setReturningId(bookId);
    try {
      const res = await authFetch(`/lending/${bookId}/return`, { method: "POST" });
      if (res.ok) {
        loadData();
      }
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-coral/10 pointer-events-none" />

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <Nav />

        <h1 className="font-display font-bold text-4xl text-ink mb-1">Borrowed</h1>
        <p className="text-ink/50 text-sm mb-8">Books you&apos;re borrowing, and books you&apos;ve lent out.</p>

        {loading && <p className="text-ink/50 text-sm">Loading...</p>}

        {error && (
          <div className="text-center py-8">
            <p className="text-coral mb-2 font-medium">{error}</p>
            <button onClick={loadData} className="text-sm text-charcoal underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <h2 className="font-display font-bold text-lg text-ink mb-3">Borrowed from others</h2>
            {borrowed.length === 0 ? (
              <p className="text-ink/50 text-sm mb-10">You&apos;re not currently borrowing any books.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {borrowed.map((book) => (
                  <div key={book.id} className="bg-off-white border-2 border-charcoal rounded-2xl p-5">
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-off-white bg-charcoal rounded-full px-2.5 py-1 mb-3">
                      Read only
                    </span>
                    <h3 className="font-display font-bold text-lg text-ink leading-tight">{book.title}</h3>
                    <p className="text-sm text-ink/50">{book.author}</p>
                  </div>
                ))}
              </div>
            )}

            <h2 className="font-display font-bold text-lg text-ink mb-3">Lent out to others</h2>
            {lentOut.length === 0 ? (
              <p className="text-ink/50 text-sm">You haven&apos;t lent any books out right now.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lentOut.map((book) => (
                  <div key={book.id} className="bg-off-white border-2 border-charcoal rounded-2xl p-5">
                    <h3 className="font-display font-bold text-lg text-ink leading-tight mb-1">{book.title}</h3>
                    <p className="text-sm text-ink/50 mb-3">{book.author}</p>
                    <button
                      onClick={() => handleReturn(book.id)}
                      disabled={returningId === book.id}
                      className="text-sm bg-coral text-off-white font-semibold px-4 py-2 rounded-full disabled:opacity-60"
                    >
                      {returningId === book.id ? "Marking..." : "Mark returned"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
