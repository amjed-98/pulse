"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface TopbarProps {
  user: Pick<Profile, "full_name" | "avatar_url">;
  onMenuClick: () => void;
}

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/analytics": "Analytics",
  "/projects": "Projects",
  "/team": "Team",
  "/settings": "Settings",
};

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const matched = Object.entries(TITLES).find(([route]) => pathname === route || pathname.startsWith(`${route}/`));
  const title = matched?.[1] ?? "Pulse";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/60 bg-white/72 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/85 text-slate-700 shadow-[var(--shadow-inset)] lg:hidden"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div>
          <p className="section-kicker">Workspace</p>
          <h1 className="text-[clamp(1.35rem,1.1rem+0.8vw,2rem)] font-semibold tracking-[-0.03em] text-slate-950">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative flex size-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/88 text-slate-600 shadow-[var(--shadow-inset)] transition hover:border-[var(--color-border-strong)] hover:text-slate-950"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.4L4 17h5" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          <span className="absolute right-3 top-3 size-2 rounded-full bg-rose-500" />
        </button>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/88 px-2 py-2 text-left shadow-[var(--shadow-inset)] transition hover:border-[var(--color-border-strong)]"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Avatar src={user.avatar_url} name={user.full_name} className="size-9" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-slate-900">{user.full_name ?? "Pulse User"}</p>
              <p className="text-xs text-slate-500">Manage account</p>
            </div>
          </button>

          {menuOpen ? (
            <div className="surface-card absolute right-0 mt-3 w-56 rounded-2xl p-2">
              <Link
                href="/settings"
                className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setMenuOpen(false)}
              >
                Profile settings
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="ghost" className="w-full justify-start text-sm text-slate-600 hover:text-slate-950">
                  Sign out
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
