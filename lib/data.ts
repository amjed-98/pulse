import { cache } from "react";

import { SEED_DATA } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActivityItem,
  AnalyticsEvent,
  AuditLog,
  Profile,
  Project,
  ProjectMember,
  ProjectWithMembers,
  WorkspaceInvite,
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

export function buildProjectMembers(projects: ProjectWithMembers[]): ProjectMember[] {
  return projects.flatMap((project) =>
    project.members.map((member) => ({
      project_id: project.id,
      user_id: member.id,
    })),
  );
}
