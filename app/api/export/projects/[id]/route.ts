import { NextResponse } from "next/server";

import { canExportProjectReport } from "@/lib/access";
import {
  getProjectActivity,
  getProjectAssets,
  getProjectById,
  getProjectComments,
  getProjectMilestones,
  getProjectTasks,
} from "@/lib/data";
import { buildProjectReport, buildProjectReportPdf } from "@/lib/export";
import { createNotification } from "@/lib/notifications";
import { createReportExportRecord } from "@/lib/report-exports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { searchParams } = new URL(request.url);
  const { id } = await params;
  const [project, activity, assets, milestones, tasks, comments] = await Promise.all([
    getProjectById(id),
    getProjectActivity(id),
    getProjectAssets(id),
    getProjectMilestones(id),
    getProjectTasks(id),
    getProjectComments(id),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const report = buildProjectReport({
    project,
    activity,
    assets,
    milestones,
    tasks,
    comments,
  });

  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const format = searchParams.get("format") === "pdf" ? "pdf" : "md";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle()
    : { data: null as null };

  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const access = { userId: user.id, role: profile.role };

  if (!canExportProjectReport(project, access)) {
    return NextResponse.json({ error: "You do not have access to export this project report." }, { status: 403 });
  }

  await createReportExportRecord({
    ownerId: user.id,
    title: `${project.name} report`,
    reportKind: "project",
    format,
    projectId: project.id,
    filters: {
      projectId: project.id,
    },
  });

  if (project.owner_id !== user.id) {
    await createNotification({
      userId: project.owner_id,
      title: "Project report exported",
      message: `${profile.full_name ?? "A collaborator"} exported the ${project.name} report in ${format.toUpperCase()} format.`,
      type: "project",
      targetPath: `/projects/${project.id}`,
    });
  }

  if (format === "pdf") {
    const pdf = await buildProjectReportPdf({
      project,
      activity,
      assets,
      milestones,
      tasks,
      comments,
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName || "project"}-report.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(report, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "project"}-report.md"`,
      "Cache-Control": "no-store",
    },
  });
}
