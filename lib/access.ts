import type { CurrentWorkspaceAccess, ProfileRole, ProjectWithMembers } from "@/lib/types";

export function canManageProject(project: Pick<ProjectWithMembers, "owner_id">, access: CurrentWorkspaceAccess | null) {
  if (!access) {
    return false;
  }

  return access.role === "admin" || project.owner_id === access.userId;
}

export function canInviteMembers(role: ProfileRole | null | undefined) {
  return role === "admin";
}

export function canExportAnalytics(role: ProfileRole | null | undefined) {
  return role === "admin" || role === "member";
}

export function canExportProjectReport(project: ProjectWithMembers, access: CurrentWorkspaceAccess | null) {
  if (!access) {
    return false;
  }

  if (access.role === "viewer") {
    return false;
  }

  if (access.role === "admin" || project.owner_id === access.userId) {
    return true;
  }

  return project.members.some((member) => member.id === access.userId);
}
