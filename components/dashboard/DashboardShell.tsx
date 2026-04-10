"use client";

import { useState } from "react";

import type { NotificationWithMeta, Profile } from "@/lib/types";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";

interface DashboardShellProps {
  user: Pick<Profile, "full_name" | "avatar_url" | "email">;
  notifications: NotificationWithMeta[];
  unreadNotificationCount: number;
  children: React.ReactNode;
}

export function DashboardShell({ user, notifications, unreadNotificationCount, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar
          user={user}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
