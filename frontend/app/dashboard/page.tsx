"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";

type ActivityItem = {
  id: number;
  event_type: string;
  message: string;
  created_at: string;
};

type ShelfSummary = {
  id: number;
  name: string;
  book_count: number;
};

type DashboardData = {
  status_counts: Record<string, number>;
  finished_this_year: number;
  average_rating: number | null;
  shelf_with_most_books: ShelfSummary | null;
  books_lent_out: number;
  shelves_shared_with_me: number;
  recent_activity: ActivityItem[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadDashboard() {
      try {
        const res = await authFetch("/dashboard/");
        if (!res.ok) {
          setError("Could not load your dashboard.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
        setLoading(false);
      } catch {
        setError("Could not reach the server.");
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60 font-mono text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-rust mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-forest underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusEntries = Object.entries(data.status_counts);

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="flex gap-[2px]">
            <div className="w-[5px] h-6 rounded-sm bg-brass" />
            <div className="w-[5px] h-5 rounded-sm bg-rust mt-1" />
            <div className="w-[5px] h-6 rounded-sm bg-forest" />
          </div>
          <span className="font-display font-semibold text-xl text-ink">BookNest</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-ink/60 hover:text-ink border border-line rounded-md px-3 py-1.5"
        >
          Log out
        </button>
      </div>

      <h1 className="font-display font-semibold text-3xl text-ink mb-1">Dashboard</h1>
      <p className="text-ink/60 text-sm mb-8">Your reading, at a glance.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {statusEntries.map(([status, count]) => (
          <div key={status} className="bg-card border border-line rounded-lg p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brass" />
            <div className="font-display font-semibold text-2xl text-ink">{count}</div>
            <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">
              {status.replace(/_/g, " ")}
            </div>
          </div>
        ))}

        <div className="bg-card border border-line rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brass" />
          <div className="font-display font-semibold text-2xl text-ink">{data.finished_this_year}</div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Finished this year</div>
        </div>

        <div className="bg-card border border-line rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brass" />
          <div className="font-display font-semibold text-2xl text-ink">
            {data.average_rating ?? "—"}
          </div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Average rating</div>
        </div>

        <div className="bg-card border border-line rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brass" />
          <div className="font-display font-semibold text-2xl text-ink">{data.books_lent_out}</div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Lent out</div>
        </div>

        <div className="bg-card border border-line rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brass" />
          <div className="font-display font-semibold text-2xl text-ink">{data.shelves_shared_with_me}</div>
          <div className="text-xs uppercase tracking-wide text-ink/50 mt-1">Shared with me</div>
        </div>
      </div>

      {data.shelf_with_most_books && (
        <div className="bg-card border border-line rounded-lg p-4 mb-8">
          <span className="text-xs uppercase tracking-wide text-ink/50">Top shelf</span>
          <div className="font-display font-semibold text-lg text-ink mt-1">
            {data.shelf_with_most_books.name}
            <span className="text-ink/50 text-sm font-body font-normal ml-2">
              {data.shelf_with_most_books.book_count} books
            </span>
          </div>
        </div>
      )}

      <div className="bg-card border border-line rounded-lg p-5">
        <h2 className="font-display font-semibold text-lg text-ink mb-3">Activity</h2>
        {data.recent_activity.length === 0 ? (
          <p className="text-sm text-ink/50">No activity yet. Add a book to get started.</p>
        ) : (
          <div className="flex flex-col">
            {data.recent_activity.map((item) => (
              <div key={item.id} className="py-2.5 border-b border-dashed border-line last:border-none">
                <p className="text-sm text-ink">{item.message}</p>
                <span className="text-[10px] font-mono text-ink/40 uppercase">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
