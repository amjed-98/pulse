import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CurrentWorkspaceAccess } from "@/lib/types";

export async function requireCurrentWorkspaceAccess(): Promise<CurrentWorkspaceAccess> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to continue.");
  }

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (error || !profile) {
    throw new Error("Your workspace profile could not be loaded.");
  }

  return {
    userId: user.id,
    role: profile.role,
  };
}

export async function requireAdminAccess(): Promise<CurrentWorkspaceAccess> {
  const access = await requireCurrentWorkspaceAccess();

  if (access.role !== "admin") {
    throw new Error("Only admins can perform this action.");
  }

  return access;
}
