"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import Nav from "@/components/Nav";

type Shelf = {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
};

type SharedShelf = {
  id: number;
  name: string;
  owner_id: number;
  role: string;
};

export default function ShelvesPage() {
  const router = useRouter();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [sharedShelves, setSharedShelves] = useState<SharedShelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadShelves = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ownedRes, sharedRes] = await Promise.all([
        authFetch("/shelves/"),
        authFetch("/shelves/shared-with-me"),
      ]);

      if (!ownedRes.ok || !sharedRes.ok) {
        setError("Could not load your shelves.");
        setLoading(false);
        return;
      }

      setShelves(await ownedRes.json());
      setSharedShelves(await sharedRes.json());
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
    loadShelves();
  }, [router, loadShelves]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await authFetch("/shelves/", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(typeof data.detail === "string" ? data.detail : "Could not create shelf.");
        setSubmitting(false);
        return;
      }

      setName("");
      setShowForm(false);
      setSubmitting(false);
      loadShelves();
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

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-4xl text-ink mb-1">Shelves</h1>
            <p className="text-ink/50 text-sm">Organize your books, share them with friends.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-coral text-off-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-coral-dark transition-colors"
          >
            {showForm ? "Cancel" : "+ New shelf"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-charcoal rounded-2xl p-6 mb-8 flex flex-col gap-4">
            <div className="sm:w-1/2">
              <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                Shelf name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral"
                placeholder="e.g. Sci-Fi Favorites"
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
              {submitting ? "Creating..." : "Create shelf"}
            </button>
          </form>
        )}

        {loading && <p className="text-ink/50 text-sm">Loading your shelves...</p>}

        {error && (
          <div className="text-center py-8">
            <p className="text-coral mb-2 font-medium">{error}</p>
            <button onClick={loadShelves} className="text-sm text-charcoal underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <h2 className="font-display font-bold text-lg text-ink mb-3">Your shelves</h2>
            {shelves.length === 0 ? (
              <p className="text-ink/50 text-sm mb-8">No shelves yet. Create your first one above.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {shelves.map((shelf) => (
                  <a
                    key={shelf.id}
                    href={`/shelves/${shelf.id}`}
                    className="bg-off-white border-2 border-charcoal rounded-2xl p-5 hover:-translate-y-0.5 transition-transform"
                  >
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-off-white bg-charcoal rounded-full px-2.5 py-1 mb-3">
                      Owner
                    </span>
                    <h3 className="font-display font-bold text-lg text-ink">{shelf.name}</h3>
                  </a>
                ))}
              </div>
            )}

            <h2 className="font-display font-bold text-lg text-ink mb-3">Shared with me</h2>
            {sharedShelves.length === 0 ? (
              <p className="text-ink/50 text-sm">No shelves have been shared with you yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedShelves.map((shelf) => (
                  <a
                    key={shelf.id}
                    href={`/shelves/${shelf.id}`}
                    className="bg-off-white border-2 border-charcoal rounded-2xl p-5 hover:-translate-y-0.5 transition-transform"
                  >
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-coral bg-coral/10 rounded-full px-2.5 py-1 mb-3">
                      {shelf.role}
                    </span>
                    <h3 className="font-display font-bold text-lg text-ink">{shelf.name}</h3>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
