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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-ink/50 text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-coral mb-2 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-charcoal underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusEntries = Object.entries(data.status_counts);
  const statCards = [
    ...statusEntries.map(([status, count]) => ({
      label: status.replace(/_/g, " "),
      value: count,
    })),
    { label: "finished this year", value: data.finished_this_year },
    { label: "average rating", value: data.average_rating ?? "—" },
    { label: "lent out", value: data.books_lent_out },
    { label: "shared with me", value: data.shelves_shared_with_me },
  ];

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-coral/10 pointer-events-none" />
      <div className="absolute top-40 -right-10 w-24 h-24 rounded-full border border-coral/30 pointer-events-none" />

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center">
              <span className="font-display font-bold text-off-white text-sm">B</span>
            </div>
            <span className="font-display font-bold text-xl text-ink">BookNest</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-ink/60 hover:text-ink border border-line rounded-full px-4 py-2 transition-colors"
          >
            Log out
          </button>
        </div>

        <h1 className="font-display font-bold text-4xl text-ink mb-1">Dashboard</h1>
        <p className="text-ink/50 text-sm mb-8">Your reading, at a glance.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className={`rounded-2xl p-5 relative overflow-hidden ${
                i === 0 ? "dot-texture bg-charcoal" : "bg-charcoal"
              }`}
            >
              <div className="font-display font-bold text-4xl text-off-white">{stat.value}</div>
              <div className="text-xs uppercase tracking-wider text-off-white/50 mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {data.shelf_with_most_books && (
          <div className="bg-off-white border-2 border-charcoal rounded-2xl p-5 mb-8 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-ink/50">Top shelf</span>
              <div className="font-display font-bold text-xl text-ink mt-1">
                {data.shelf_with_most_books.name}
              </div>
            </div>
            <div className="font-display font-bold text-3xl text-coral">
              {data.shelf_with_most_books.book_count}
            </div>
          </div>
        )}

        <div className="bg-off-white border-2 border-charcoal rounded-2xl p-6">
          <h2 className="font-display font-bold text-xl text-ink mb-4">Activity</h2>
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-ink/50">No activity yet. Add a book to get started.</p>
          ) : (
            <div className="flex flex-col">
              {data.recent_activity.map((item) => (
                <div key={item.id} className="py-3 border-b border-line last:border-none flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-coral mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-ink">{item.message}</p>
                    <span className="text-[11px] font-medium text-ink/40 uppercase tracking-wide">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
