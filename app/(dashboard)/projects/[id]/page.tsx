import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetailEditor } from "@/components/dashboard/ProjectDetailEditor";
import { getProjectById } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);

  return {
    title: project ? project.name : "Project",
    description: project?.description ?? "Project detail view in Pulse.",
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Project detail</p>
      </div>
      <ProjectDetailEditor project={project} />
    </div>
  );
}
