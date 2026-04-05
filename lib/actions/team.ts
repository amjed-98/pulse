"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

function mapErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function inviteMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return mapErrors(parsed.error);
  }

  const adminClient = await createSupabaseAdminClient();

  if (!adminClient) {
    return {
      success: false,
      message: "Set SUPABASE_SERVICE_ROLE_KEY to send team invites.",
    };
  }

  const { error } = await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    data: {
      full_name: parsed.data.email.split("@")[0],
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/team");
  return { success: true, message: `Invite sent to ${parsed.data.email}.` };
}

export async function removeMember(userId: string): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in to remove a member." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "admin") {
    return { success: false, message: "Only admins can remove team members." };
  }

  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { success: true, message: "Team member removed." };
}
