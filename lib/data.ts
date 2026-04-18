import { cache } from "react";

import { getWorkspaceBillingInvoices, getWorkspaceBillingSummary } from "@/lib/billing";
import { SEED_DATA } from "@/lib/constants";
import { buildReportExportPath } from "@/lib/report-exports";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityItem,
  AnalyticsEvent,
  AnalyticsSavedView,
  AuditLog,
  NotificationWithMeta,
  Profile,
  ProjectAsset,
  ProjectAssetWithUrl,
  ProjectComment,
  ProjectCommentWithAuthor,
  ProjectMilestone,
  Project,
  ProjectMember,
  ProjectTask,
  ProjectTaskWithAssignee,
  ProjectWithMembers,
  ReportExport,
  ReportExportWithMeta,
  WorkspaceInvite,
  WorkspaceBillingSummary,
  WorkspaceInvoiceSummary,
  WorkspaceReadiness,
} from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

function fallbackProjectMembers(projects: Project[]): ProjectWithMembers[] {
  return projects.map((project) => ({
    ...project,
    members: SEED_DATA.projects.find((seedProject) => seedProject.id === project.id)?.members ?? [],
  }));
}

function buildMemberList(project: Project, memberships: ProjectMember[], profiles: Profile[]) {
  const memberIds = new Set<string>([project.owner_id]);

  for (const membership of memberships) {
    if (membership.project_id === project.id) {
      memberIds.add(membership.user_id);
    }
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return Array.from(memberIds)
    .map((id) => profileMap.get(id))
    .filter((profile): profile is Profile => Boolean(profile));
}

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (error) {
    return null;
  }

  return data;
});

export const getWorkspaceBilling = cache(async (): Promise<WorkspaceBillingSummary | null> => {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  return getWorkspaceBillingSummary(profile.id);
});

export const getWorkspaceInvoiceHistory = cache(async (): Promise<WorkspaceInvoiceSummary[]> => {
  const profile = await getCurrentProfile();

  if (!profile) {
    return [];
  }

  return getWorkspaceBillingInvoices(profile.id);
});

export const getAnalyticsSavedViews = cache(async (): Promise<AnalyticsSavedView[]> => {
  const profile = await getCurrentProfile();

  if (!profile) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("analytics_saved_views")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    return [];
  }

  return data;
});

export const getAnalyticsReportExports = cache(async (): Promise<ReportExportWithMeta[]> => {
  const profile = await getCurrentProfile();

  if (!profile) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_exports")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("report_kind", "analytics")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    return [];
  }

  return data.map((report: ReportExport) => ({
    ...report,
    relativeTime: formatRelativeTime(report.created_at),
    downloadPath: buildReportExportPath(report),
  }));
});

export const getNotifications = cache(async (): Promise<NotificationWithMeta[]> => {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    return [];
  }

  return data.map((notification) => ({
    ...notification,
    relativeTime: formatRelativeTime(notification.created_at),
  }));
});

export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();

  if (!user) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
});

export const getProfiles = cache(async (): Promise<Profile[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return data;
});

export const getWorkspaceInvites = cache(async (): Promise<WorkspaceInvite[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("status", "pending")
    .order("invited_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  return data;
});

export const getWorkspaceProjects = cache(async (): Promise<ProjectWithMembers[]> => {
  const supabase = await createSupabaseServerClient();
  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectError || !projects?.length) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id,user_id")
    .in("project_id", projectIds);

  if (!memberships?.length) {
    return fallbackProjectMembers(projects);
  }

  const memberIds = Array.from(new Set(memberships.map((membership) => membership.user_id)));
  const ownerIds = Array.from(new Set(projects.map((project) => project.owner_id)));
  const allProfileIds = Array.from(new Set([...memberIds, ...ownerIds]));
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", allProfileIds);

  return projects.map((project) => ({
    ...project,
    members: buildMemberList(project, memberships, profiles ?? []),
  }));
});

export const getProjects = cache(async (): Promise<ProjectWithMembers[]> => {
  const projects = await getWorkspaceProjects();

  if (projects.length > 0) {
    return projects;
  }

  return SEED_DATA.projects;
});

export async function getProjectById(projectId: string): Promise<ProjectWithMembers | null> {
  const supabase = await createSupabaseServerClient();
  const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();

  if (error) {
    return null;
  }

  if (!project) {
    return null;
  }

  const { data: memberships } = await supabase.from("project_members").select("project_id,user_id").eq("project_id", projectId);
  const memberIds = Array.from(new Set([project.owner_id, ...(memberships ?? []).map((membership) => membership.user_id)]));
  const { data: profiles } =
    memberIds.length > 0 ? await supabase.from("profiles").select("*").in("id", memberIds) : { data: [] as Profile[] };

  return {
    ...project,
    members: buildMemberList(project, memberships ?? [], profiles ?? []),
  };
}

export const getWorkspaceAnalyticsEvents = cache(async (): Promise<AnalyticsEvent[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("analytics_events")
    .select("*")
    .order("recorded_at", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return data;
});

export const getAnalyticsEvents = cache(async (): Promise<AnalyticsEvent[]> => {
  const events = await getWorkspaceAnalyticsEvents();

  if (events.length > 0) {
    return events;
  }

  return SEED_DATA.events;
});

function getActivityTone(eventType: string): ActivityItem["type"] {
  if (eventType.startsWith("project.")) {
    return "project";
  }

  if (eventType.startsWith("team.")) {
    return "team";
  }

  if (eventType.startsWith("revenue.") || eventType.startsWith("analytics.")) {
    return "revenue";
  }

  return "system";
}

function mapAuditLogToActivity(log: AuditLog): ActivityItem {
  return {
    id: log.id,
    title: log.title,
    description: log.description ?? "Workspace activity was recorded.",
    timestamp: formatRelativeTime(log.created_at),
    type: getActivityTone(log.event_type),
  };
}

export const getActivityFeed = cache(async (): Promise<ActivityItem[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(6);

  if (error || !data?.length) {
    return [];
  }

  return data.map(mapAuditLogToActivity);
});

export async function getProjectActivity(projectId: string): Promise<ActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    return [];
  }

  return data.map(mapAuditLogToActivity);
}

export async function getProjectAssets(projectId: string): Promise<ProjectAssetWithUrl[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  return data.map((asset: ProjectAsset) => ({
    ...asset,
    publicUrl: supabase.storage.from("project-assets").getPublicUrl(asset.object_path).data.publicUrl,
  }));
}

export async function getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return data;
}

export async function getProjectTasks(projectId: string): Promise<ProjectTaskWithAssignee[]> {
  const supabase = await createSupabaseServerClient();
  const { data: tasks, error } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !tasks?.length) {
    return [];
  }

  const assigneeIds = Array.from(
    new Set(
      tasks
        .map((task: ProjectTask) => task.assignee_id)
        .filter((assigneeId): assigneeId is string => Boolean(assigneeId)),
    ),
  );
  const { data: assignees } =
    assigneeIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", assigneeIds)
      : { data: [] as Profile[] };
  const assigneeMap = new Map((assignees ?? []).map((profile) => [profile.id, profile]));

  return tasks.map((task: ProjectTask) => ({
    ...task,
    assignee: task.assignee_id ? assigneeMap.get(task.assignee_id) ?? null : null,
  }));
}

export async function getProjectComments(projectId: string): Promise<ProjectCommentWithAuthor[]> {
  const supabase = await createSupabaseServerClient();
  const { data: comments, error } = await supabase
    .from("project_comments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !comments?.length) {
    return [];
  }

  const authorIds = Array.from(
    new Set(
      comments
        .map((comment: ProjectComment) => comment.author_id)
        .filter((authorId): authorId is string => Boolean(authorId)),
    ),
  );
  const { data: authors } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] };
  const authorMap = new Map((authors ?? []).map((profile) => [profile.id, profile]));

  return comments.map((comment: ProjectComment) => ({
    ...comment,
    author: authorMap.get(comment.author_id) ?? null,
    relativeTime: formatRelativeTime(comment.created_at),
  }));
}

export async function getProjectReportExports(projectId: string): Promise<ReportExportWithMeta[]> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_exports")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("report_kind", "project")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    return [];
  }

  return data.map((report: ReportExport) => ({
    ...report,
    relativeTime: formatRelativeTime(report.created_at),
    downloadPath: buildReportExportPath(report),
  }));
}

export const getWorkspaceReadiness = cache(async (): Promise<WorkspaceReadiness> => {
  const [projects, events, team, activity] = await Promise.all([
    getWorkspaceProjects(),
    getWorkspaceAnalyticsEvents(),
    getProfiles(),
    getActivityFeed(),
  ]);

  const checklist = [
    {
      id: "profile",
      title: "Complete your workspace profile",
      description: "Add your name and avatar so the workspace feels like a real operating environment.",
      done: team.length > 0,
    },
    {
      id: "project",
      title: "Create your first live project",
      description: "Replace placeholder portfolio narratives with a real project record and delivery timeline.",
      done: projects.length > 0,
    },
    {
      id: "team",
      title: "Invite at least one teammate",
      description: "Show that the product supports collaboration and role-aware administration.",
      done: team.length > 1,
    },
    {
      id: "analytics",
      title: "Capture live product events",
      description: "Instrument real events so analytics and revenue views are grounded in workspace activity.",
      done: events.length > 0,
    },
    {
      id: "audit",
      title: "Generate audit trail activity",
      description: "Mutations should leave a visible history across projects, team actions, and settings.",
      done: activity.length > 0,
    },
  ];

  return {
    liveProjectCount: projects.length,
    liveEventCount: events.length,
    teamCount: team.length,
    activityCount: activity.length,
    isBootstrapped: checklist.every((item) => item.done),
    checklist,
  };
});

export function filterEventsByDays(events: AnalyticsEvent[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return events.filter((event) => new Date(event.recorded_at) >= cutoff);
}

export function filterEventsByCategory(
  events: AnalyticsEvent[],
  category: "all" | "conversions" | "projects" | "team" | "billing",
) {
  if (category === "all") {
    return events;
  }

  return events.filter((event) => {
    if (category === "conversions") {
      return event.event_name.includes("conversion");
    }

    if (category === "projects") {
      return event.event_name.startsWith("project_");
    }

    if (category === "team") {
      return event.event_name.startsWith("team_") || event.event_name.includes("invite");
    }

    return event.event_name.includes("billing") || event.event_name.includes("subscription") || event.event_name.includes("invoice");
  });
}

export function buildProjectMembers(projects: ProjectWithMembers[]): ProjectMember[] {
  return projects.flatMap((project) =>
    project.members.map((member) => ({
      project_id: project.id,
      user_id: member.id,
    })),
  );
}
