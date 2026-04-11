import { NextResponse } from "next/server";

import {
  getProjectActivity,
  getProjectAssets,
  getProjectById,
  getProjectComments,
  getProjectMilestones,
  getProjectTasks,
} from "@/lib/data";
import { buildProjectReport } from "@/lib/export";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  return new NextResponse(report, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "project"}-report.md"`,
      "Cache-Control": "no-store",
    },
  });
}
