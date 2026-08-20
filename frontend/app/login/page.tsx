"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Login failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      router.push("/dashboard");
    } catch {
      setError("Could not reach the server. Is the backend running?");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-coral/90" />
      <div className="absolute top-16 left-40 w-32 h-32 rounded-full border border-coral/40" />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center">
            <span className="font-display font-bold text-off-white text-sm">B</span>
          </div>
          <span className="font-display font-bold text-xl text-ink">BookNest</span>
        </div>

        <div className="dot-texture bg-charcoal rounded-3xl p-8 shadow-xl">
          <h1 className="font-display font-bold text-3xl text-off-white mb-1">Welcome back</h1>
          <p className="text-sm text-off-white/60 mb-7">Log in to your shelves and lending history.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral placeholder:text-off-white/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-off-white/50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-charcoal-light text-off-white text-sm outline-none focus:ring-2 focus:ring-coral placeholder:text-off-white/30"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-coral bg-coral/10 border border-coral/30 rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-coral text-off-white font-semibold text-sm py-3.5 rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Logging in..." : "Log in"}
              {!loading && <span className="text-lg leading-none">&rarr;</span>}
            </button>
          </form>

          <p className="text-center text-sm text-off-white/50 mt-6">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-coral font-medium hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
