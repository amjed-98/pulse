import type { Metadata } from "next";

import { TeamInviteForm } from "@/components/dashboard/TeamInviteForm";
import { TeamTable } from "@/components/dashboard/TeamTable";
import { getCurrentProfile, getProfiles } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Team",
    description: "Manage team access and roles in Pulse.",
  };
}

export default async function TeamPage() {
  const [profile, team] = await Promise.all([getCurrentProfile(), getProfiles()]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Team</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Members and roles</h1>
        <p className="mt-2 text-sm text-slate-500">Manage collaborator access and keep permissions easy to audit.</p>
      </section>

      <TeamInviteForm />
      <TeamTable members={team} currentUserRole={profile?.role ?? "member"} />
    </div>
  );
}
