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
