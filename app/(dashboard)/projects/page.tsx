import type { Metadata } from "next";
import Link from "next/link";

import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { WorkspaceSetupCard } from "@/components/dashboard/WorkspaceSetupCard";
import { Button } from "@/components/ui/Button";
import { getCurrentProfile, getCurrentUser, getWorkspaceProjects, getWorkspaceReadiness } from "@/lib/data";

const filters = ["all", "active", "paused", "completed", "archived"] as const;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Projects",
    description: "Track and manage workspace projects in Pulse.",
  };
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = filters.includes((params.status ?? "all") as (typeof filters)[number])
    ? (params.status ?? "all")
    : "all";
  const [user, profile, projects, readiness] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getWorkspaceProjects(),
    getWorkspaceReadiness(),
  ]);
  const filteredProjects = status === "all" ? projects : projects.filter((project) => project.status === status);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Delivery portfolio</h1>
          <p className="mt-2 text-sm text-slate-500">Browse active work, sort priorities, and update project health.</p>
        </div>
        <CreateProjectModal />
      </section>

      {projects.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                key={filter}
                href={filter === "all" ? "/projects" : `/projects?status=${filter}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  status === filter
                    ? "bg-[var(--color-accent)] !text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-accent-strong)]"
                    : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {filter === "all" ? "All" : filter}
              </Link>
            ))}
          </div>

          <ProjectsTable projects={filteredProjects} currentUserId={user?.id ?? null} currentUserRole={profile?.role ?? null} />
        </>
      ) : (
        <>
          <EmptyState
            eyebrow="Projects"
            title="No live projects yet"
            description="This workspace has no real project records yet. Start with one concrete delivery initiative so the portfolio begins reflecting actual planning, ownership, and execution."
            actions={
              <>
                <CreateProjectModal triggerLabel="Create first project" />
                <Link href="/settings">
                  <Button variant="secondary">Review workspace settings</Button>
                </Link>
              </>
            }
            aside={
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">What to add first</p>
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  <li>Name one live client initiative or internal roadmap stream.</li>
                  <li>Set due date and status so the dashboard can track execution health.</li>
                  <li>Invite collaborators after the first project exists.</li>
                </ul>
              </div>
            }
          />
          <WorkspaceSetupCard
            readiness={readiness}
            title="Setup progress"
            description="Until you add live projects, the dashboard stays partially in preview mode. These steps move the product toward a real client-facing case study."
          />
        </>
      )}
    </div>
  );
}
