"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters."),
  description: z.string().max(400, "Description must be 400 characters or fewer.").optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  progress: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
});

function mapErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function createProject(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    status: formData.get("status") ?? "active",
    progress: formData.get("progress") ?? 0,
    dueDate: formData.get("dueDate") ?? "",
  });

  if (!parsed.success) {
    return mapErrors(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in to create a project." };
  }

  const { error } = await supabase.from("projects").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    status: parsed.data.status,
    progress: parsed.data.progress,
    due_date: parsed.data.dueDate || null,
    owner_id: user.id,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, message: "Project created." };
}

export async function updateProject(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectSchema.partial().safeParse({
    name: formData.get("name") ?? undefined,
    description: formData.get("description") ?? undefined,
    status: formData.get("status") ?? undefined,
    progress: formData.get("progress") ?? undefined,
    dueDate: formData.get("dueDate") ?? undefined,
  });

  if (!parsed.success) {
    return mapErrors(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const updates = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.progress !== undefined ? { progress: parsed.data.progress } : {}),
    ...(parsed.data.dueDate !== undefined ? { due_date: parsed.data.dueDate || null } : {}),
  };

  const { error } = await supabase.from("projects").update(updates).eq("id", projectId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { success: true, message: "Project updated." };
}

export async function deleteProject(projectId: string): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, message: "Project deleted." };
}
