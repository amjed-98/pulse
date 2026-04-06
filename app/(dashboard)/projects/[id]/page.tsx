import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetailEditor } from "@/components/dashboard/ProjectDetailEditor";
import { canManageProject } from "@/lib/access";
import { getCurrentProfile, getCurrentUser, getProfiles, getProjectActivity, getProjectById } from "@/lib/data";

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
  const [project, user, profile, allProfiles, activity] = await Promise.all([
    getProjectById(id),
    getCurrentUser(),
    getCurrentProfile(),
    getProfiles(),
    getProjectActivity(id),
  ]);

  if (!project) {
    notFound();
  }

  const canManage =
    user && profile ? canManageProject(project, { userId: user.id, role: profile.role }) : false;
  const availableMembers = allProfiles.filter((member) => !project.members.some((existing) => existing.id === member.id));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Project detail</p>
      </div>
      <ProjectDetailEditor project={project} canManage={canManage} availableMembers={availableMembers} activity={activity} />
    </div>
  );
}
