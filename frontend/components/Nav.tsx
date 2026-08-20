"use client";

import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/books", label: "My Books" },
  { href: "/shelves", label: "Shelves" },
  { href: "/borrowed", label: "Borrowed" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/login");
  }

  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div className="flex items-center gap-8">
        <a href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center">
            <span className="font-display font-bold text-off-white text-sm">B</span>
          </div>
          <span className="font-display font-bold text-xl text-ink">BookNest</span>
        </a>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium px-3.5 py-2 rounded-full transition-colors ${
                  active
                    ? "bg-charcoal text-off-white"
                    : "text-ink/60 hover:text-ink hover:bg-charcoal/5"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="text-sm font-medium text-ink/60 hover:text-ink border border-line rounded-full px-4 py-2 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
