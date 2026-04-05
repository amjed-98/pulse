import { cache } from "react";

import { SEED_DATA } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalyticsEvent, Profile, Project, ProjectMember, ProjectWithMembers } from "@/lib/types";

function fallbackProjectMembers(projects: Project[]): ProjectWithMembers[] {
  return projects.map((project) => ({
    ...project,
    members: SEED_DATA.projects.find((seedProject) => seedProject.id === project.id)?.members ?? [],
  }));
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
    return SEED_DATA.team;
  }

  return data;
});

export const getProjects = cache(async (): Promise<ProjectWithMembers[]> => {
  const supabase = await createSupabaseServerClient();
  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectError || !projects?.length) {
    return SEED_DATA.projects;
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
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", memberIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return projects.map((project) => ({
    ...project,
    members: memberships
      .filter((membership) => membership.project_id === project.id)
      .map((membership) => profileMap.get(membership.user_id))
      .filter((profile): profile is Profile => Boolean(profile)),
  }));
});

export async function getProjectById(projectId: string): Promise<ProjectWithMembers | null> {
  const supabase = await createSupabaseServerClient();
  const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();

  if (error) {
    return null;
  }

  if (!project) {
    return SEED_DATA.projects.find((item) => item.id === projectId) ?? null;
  }

  const { data: memberships } = await supabase.from("project_members").select("project_id,user_id").eq("project_id", projectId);
  const memberIds = Array.from(new Set((memberships ?? []).map((membership) => membership.user_id)));
  const { data: profiles } =
    memberIds.length > 0 ? await supabase.from("profiles").select("*").in("id", memberIds) : { data: [] as Profile[] };

  return {
    ...project,
    members: profiles ?? [],
  };
}

export const getAnalyticsEvents = cache(async (): Promise<AnalyticsEvent[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("analytics_events")
    .select("*")
    .order("recorded_at", { ascending: true });

  if (error || !data?.length) {
    return SEED_DATA.events;
  }

  return data;
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
