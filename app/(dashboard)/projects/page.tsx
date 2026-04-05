import type { Metadata } from "next";
import Link from "next/link";

import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { getProjects } from "@/lib/data";

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
  const projects = await getProjects();
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

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter}
            href={filter === "all" ? "/projects" : `/projects?status=${filter}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              status === filter
                ? "bg-[var(--color-accent)] text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-accent-strong)]"
                : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {filter === "all" ? "All" : filter}
          </Link>
        ))}
      </div>

      <ProjectsTable projects={filteredProjects} />
    </div>
  );
}
