import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetailEditor } from "@/components/dashboard/ProjectDetailEditor";
import { ReportExportsPanel } from "@/components/dashboard/ReportExportsPanel";
import { canManageProject } from "@/lib/access";
import {
  getCurrentProfile,
  getCurrentUser,
  getProfiles,
  getProjectActivity,
  getProjectAssets,
  getProjectById,
  getProjectComments,
  getProjectMilestones,
  getProjectReportExports,
  getProjectTasks,
} from "@/lib/data";

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
  const [project, user, profile, allProfiles, activity, assets, milestones, tasks, comments, reportExports] = await Promise.all([
    getProjectById(id),
    getCurrentUser(),
    getCurrentProfile(),
    getProfiles(),
    getProjectActivity(id),
    getProjectAssets(id),
    getProjectMilestones(id),
    getProjectTasks(id),
    getProjectComments(id),
    getProjectReportExports(id),
  ]);

  if (!project) {
    notFound();
  }

  const canManage =
    user && profile ? canManageProject(project, { userId: user.id, role: profile.role }) : false;
  const availableMembers = allProfiles.filter((member) => !project.members.some((existing) => existing.id === member.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Project detail</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/export/projects/${project.id}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Export Markdown
          </a>
          <a
            href={`/api/export/projects/${project.id}?format=pdf`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Export PDF
          </a>
        </div>
      </div>
      <ProjectDetailEditor
        project={project}
        canManage={canManage}
        currentUserId={user?.id ?? null}
        availableMembers={availableMembers}
        activity={activity}
        assets={assets}
        milestones={milestones}
        tasks={tasks}
        comments={comments}
      />
      <ReportExportsPanel
        title="Recent project reports"
        description="Project export history helps teams resend the same delivery package to clients without reconstructing the report every time."
        exports={reportExports}
        emptyMessage="Markdown and PDF project reports will appear here after the first export."
      />
    </div>
  );
}
