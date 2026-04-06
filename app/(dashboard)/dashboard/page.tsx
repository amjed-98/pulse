import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DemoPreviewNotice } from "@/components/dashboard/DemoPreviewNotice";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { WorkspaceSetupCard } from "@/components/dashboard/WorkspaceSetupCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { DASHBOARD_STATS, SEED_DATA } from "@/lib/constants";
import {
  getActivityFeed,
  getCurrentProfile,
  getProfiles,
  getWorkspaceAnalyticsEvents,
  getWorkspaceProjects,
  getWorkspaceReadiness,
} from "@/lib/data";
import { buildDashboardStats, buildRevenueFromEvents, formatDate, getGreeting } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Overview",
    description: "High-level revenue, project, and team performance in Pulse.",
  };
}

async function OverviewContent() {
  const [profile, liveProjects, liveEvents, activity, readiness, liveTeam] = await Promise.all([
    getCurrentProfile(),
    getWorkspaceProjects(),
    getWorkspaceAnalyticsEvents(),
    getActivityFeed(),
    getWorkspaceReadiness(),
    getProfiles(),
  ]);
  const usingPreviewProjects = liveProjects.length === 0;
  const usingPreviewAnalytics = liveEvents.length === 0;
  const projects = usingPreviewProjects ? SEED_DATA.projects : liveProjects;
  const team = liveTeam.length > 0 ? liveTeam : SEED_DATA.team;
  const revenueData = buildRevenueFromEvents(usingPreviewAnalytics ? SEED_DATA.events : liveEvents);
  const stats =
    liveProjects.length > 0 || liveEvents.length > 0 || liveTeam.length > 0
      ? buildDashboardStats(projects, usingPreviewAnalytics ? SEED_DATA.events : liveEvents, team)
      : DASHBOARD_STATS;
  const greetingName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Overview</p>
        <h1 className="text-3xl font-semibold text-slate-950">
          {getGreeting()}, {greetingName}
        </h1>
        <p className="text-sm text-slate-500">Track growth, execution, and team health from a single control room.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {!readiness.isBootstrapped ? <WorkspaceSetupCard readiness={readiness} /> : null}

      {usingPreviewProjects || usingPreviewAnalytics ? (
        <DemoPreviewNotice
          title="Preview data is filling the gaps"
          description="This dashboard still uses seeded portfolio data where your live workspace is empty. Create projects, invite teammates, and capture events to phase preview data out naturally."
        />
      ) : null}

      <section>
        <RevenueChart data={revenueData} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ActivityFeed items={activity.length > 0 ? activity : SEED_DATA.activity} />
        <div className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">Top projects</h2>
            <p className="text-sm text-slate-500">The most active initiatives across your workspace.</p>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map((project) => (
              <article key={project.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h3 className="font-medium text-slate-900">{project.name}</h3>
                  <span className="text-sm text-slate-500">{project.progress}%</span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${project.progress}%` }} />
                </div>
                <p className="text-sm text-slate-500">Due {formatDate(project.due_date)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function DashboardOverviewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[720px] w-full rounded-[2rem]" />}>
      <OverviewContent />
    </Suspense>
  );
}
