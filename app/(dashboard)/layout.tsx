import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getCurrentProfile, getCurrentUser, getNotifications, getUnreadNotificationCount } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Dashboard",
    description: "Pulse workspace dashboard.",
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const [notifications, unreadNotificationCount] = await Promise.all([
    getNotifications(),
    getUnreadNotificationCount(),
  ]);
  const shellUser = {
    full_name: profile?.full_name ?? user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "Pulse User",
    avatar_url: profile?.avatar_url ?? user.user_metadata.avatar_url ?? null,
    email: profile?.email ?? user.email ?? null,
  };

  return (
    <DashboardShell user={shellUser} notifications={notifications} unreadNotificationCount={unreadNotificationCount}>
      {children}
    </DashboardShell>
  );
}
