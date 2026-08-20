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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex gap-[2px]">
            <div className="w-[5px] h-6 rounded-sm bg-brass" />
            <div className="w-[5px] h-5 rounded-sm bg-rust mt-1" />
            <div className="w-[5px] h-6 rounded-sm bg-forest" />
          </div>
          <span className="font-display font-semibold text-xl text-ink">BookNest</span>
        </div>

        <div className="bg-card border border-line rounded-lg p-8">
          <h1 className="font-display font-semibold text-2xl text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink/60 mb-6">Log in to your shelves and lending history.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-line bg-paper text-ink text-sm outline-none focus:ring-2 focus:ring-brass"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-line bg-paper text-ink text-sm outline-none focus:ring-2 focus:ring-brass"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-rust bg-rust/10 border border-rust/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-forest text-paper font-medium text-sm py-2.5 rounded-md hover:bg-forest-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="text-center text-sm text-ink/60 mt-6">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-forest font-medium hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
