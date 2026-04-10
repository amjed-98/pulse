"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

import { signOut } from "@/lib/actions/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationWithMeta, Profile } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

interface TopbarProps {
  user: Pick<Profile, "full_name" | "avatar_url">;
  notifications: NotificationWithMeta[];
  unreadNotificationCount: number;
  onMenuClick: () => void;
}

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/analytics": "Analytics",
  "/projects": "Projects",
  "/team": "Team",
  "/settings": "Settings",
};

export function Topbar({ user, notifications, unreadNotificationCount, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const { showToast } = useToast();

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
        <div className="relative">
          <button
            type="button"
            className="relative flex size-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/88 text-slate-600 shadow-[var(--shadow-inset)] transition hover:border-[var(--color-border-strong)] hover:text-slate-950"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.4L4 17h5" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
            {unreadNotificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {Math.min(unreadNotificationCount, 9)}{unreadNotificationCount > 9 ? "+" : ""}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="surface-card absolute right-0 mt-3 w-[22rem] rounded-2xl p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Notifications</p>
                  <p className="text-xs text-slate-500">
                    {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread updates` : "All caught up"}
                  </p>
                </div>
                {unreadNotificationCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={isPending && activeNotificationId === "all"}
                    onClick={() => {
                      startTransition(async () => {
                        setActiveNotificationId("all");
                        const result = await markAllNotificationsRead();
                        setActiveNotificationId(null);
                        if (result.message) {
                          showToast({
                            tone: result.success ? "success" : "error",
                            message: result.message,
                          });
                        }
                      });
                    }}
                  >
                    Mark all read
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-xl border px-3 py-3 ${
                        notification.read_at
                          ? "border-slate-100 bg-white"
                          : "border-indigo-100 bg-indigo-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{notification.relativeTime}</p>
                        </div>
                        {!notification.read_at ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            loading={isPending && activeNotificationId === notification.id}
                            onClick={() => {
                              startTransition(async () => {
                                setActiveNotificationId(notification.id);
                                const result = await markNotificationRead(notification.id);
                                setActiveNotificationId(null);
                                if (result.message) {
                                  showToast({
                                    tone: result.success ? "success" : "error",
                                    message: result.message,
                                  });
                                }
                              });
                            }}
                          >
                            Read
                          </Button>
                        ) : null}
                      </div>
                      {notification.target_path ? (
                        <Link
                          href={notification.target_path}
                          className="mt-3 inline-flex text-sm font-medium text-[var(--color-accent)]"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm leading-7 text-slate-500">
                    No notifications yet. Team activity, project delivery changes, and account events will appear here.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

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
