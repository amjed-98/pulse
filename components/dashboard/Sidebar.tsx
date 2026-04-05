"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { signOut } from "@/lib/actions/auth";
import { NAV_ITEMS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  user: Pick<Profile, "full_name" | "avatar_url" | "email">;
  mobileOpen?: boolean;
  onClose?: () => void;
}

function Icon({ name, className }: { name: (typeof NAV_ITEMS)[number]["icon"]; className?: string }) {
  const paths = {
    dashboard: <path d="M4 13h7V4H4zm9 7h7v-9h-7zM4 20h7v-5H4zm9-9h7V4h-7z" />,
    analytics: <path d="M5 19V9m7 10V5m7 14v-7" />,
    projects: <path d="M3 7h18M6 3h12a2 2 0 0 1 2 2v14H4V5a2 2 0 0 1 2-2Z" />,
    team: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    settings: (
      <>
        <path d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        <circle cx="12" cy="12" r="3.5" />
      </>
    ),
  } satisfies Record<string, React.ReactNode>;

  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} fill="none" stroke="currentColor" strokeWidth="1.9">
      {paths[name]}
    </svg>
  );
}

function SidebarContent({ user, onClose }: Omit<SidebarProps, "mobileOpen">) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col bg-[linear-gradient(180deg,#0f172a_0%,#111c34_52%,#13213f_100%)] px-5 py-6 text-[var(--color-sidebar-foreground)]">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-[0_14px_28px_-18px_rgba(14,165,233,0.45)]">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 14c3.2 0 3.2-4 6.4-4 3.2 0 3.2 8 6.4 8 1.6 0 2.4-1 3.2-2" />
            <path d="M4 8c3.2 0 3.2-4 6.4-4 3.2 0 3.2 8 6.4 8 1.6 0 2.4-1 3.2-2" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">Pulse</p>
          <p className="text-sm text-[var(--color-sidebar-muted)]">Analytics OS</p>
        </div>
      </div>

      <nav className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200",
                active
                  ? "bg-[linear-gradient(135deg,rgba(99,102,241,0.42),rgba(14,165,233,0.18))] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_18px_30px_-22px_rgba(79,70,229,0.8)]"
                  : "text-[var(--color-sidebar-foreground)]/80 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon name={item.icon} className={active ? "text-white" : "text-[var(--color-sidebar-muted)]"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/6 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={user.avatar_url} name={user.full_name} className="size-11" />
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{user.full_name ?? "Pulse User"}</p>
            <p className="truncate text-sm text-[var(--color-sidebar-muted)]">{user.email ?? "Workspace member"}</p>
          </div>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full border-white/12 bg-white/10 text-white hover:bg-white/15">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function Sidebar({ user, mobileOpen = false, onClose }: SidebarProps) {
  return (
    <>
      <div className="hidden h-screen w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-72 border-r border-slate-900/8 shadow-[18px_0_50px_-40px_rgba(15,23,42,0.45)]">
          <SidebarContent user={user} />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-label="Close sidebar"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[84vw] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <SidebarContent user={user} onClose={onClose} />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
