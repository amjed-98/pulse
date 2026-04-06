import type { Metadata } from "next";

import { PendingInvites } from "@/components/dashboard/PendingInvites";
import { TeamInviteForm } from "@/components/dashboard/TeamInviteForm";
import { TeamTable } from "@/components/dashboard/TeamTable";
import { canInviteMembers } from "@/lib/access";
import { getCurrentProfile, getCurrentUser, getProfiles, getWorkspaceInvites } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Team",
    description: "Manage team access and roles in Pulse.",
  };
}

export default async function TeamPage() {
  const [user, profile, team, invites] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getProfiles(),
    getWorkspaceInvites(),
  ]);
  const canManageTeam = canInviteMembers(profile?.role);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Team</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Members and roles</h1>
        <p className="mt-2 text-sm text-slate-500">Manage collaborator access and keep permissions easy to audit.</p>
      </section>

      <TeamInviteForm canInvite={canManageTeam} />
      <PendingInvites invites={invites} canManage={canManageTeam} />
      <TeamTable members={team} currentUserId={user?.id ?? null} currentUserRole={profile?.role ?? "member"} />
    </div>
  );
}
