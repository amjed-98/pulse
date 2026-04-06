"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAnalyticsEvent } from "@/lib/analytics";
import { createAuditLog } from "@/lib/audit";
import { toActionErrorState } from "@/lib/logger";
import { requireCurrentWorkspaceAccess } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters."),
  description: z.string().max(400, "Description must be 400 characters or fewer.").optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  progress: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
});

const memberSchema = z.object({
  userId: z.string().uuid("Select a valid team member."),
});

function mapErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function createProject(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
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
    const access = await requireCurrentWorkspaceAccess();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || null,
        status: parsed.data.status,
        progress: parsed.data.progress,
        due_date: parsed.data.dueDate || null,
        owner_id: access.userId,
      })
      .select("id,name,status")
      .single();

    if (error) {
      return toActionErrorState({
        source: "projects.createProject",
        message: "Project creation failed during insert.",
        userMessage: "Could not create the project right now.",
        error,
        context: {
          userId: access.userId,
          name: parsed.data.name,
          status: parsed.data.status,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId: project.id,
      eventType: "project.created",
      title: `Created ${project.name}`,
      description: `A new ${project.status} project was added to the workspace.`,
      metadata: {
        status: project.status,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_created",
      value: 1,
    });

    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { success: true, message: "Project created." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.createProject",
      message: "Unexpected failure while creating project.",
      userMessage: "Could not create the project right now.",
      error,
      context: {
        name: formData.get("name"),
        status: formData.get("status"),
      },
    });
  }
}

export async function updateProject(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
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
    const access = await requireCurrentWorkspaceAccess();

    const { data: existingProject, error: existingProjectError } = await supabase
      .from("projects")
      .select("id,name,owner_id,status")
      .eq("id", projectId)
      .maybeSingle();

    if (existingProjectError) {
      return toActionErrorState({
        source: "projects.updateProject",
        message: "Project lookup failed before update.",
        userMessage: "Could not update the project right now.",
        error: existingProjectError,
        context: {
          projectId,
          userId: access.userId,
        },
      });
    }

    if (!existingProject) {
      return { success: false, message: "Project not found or you no longer have access." };
    }

    if (access.role !== "admin" && existingProject.owner_id !== access.userId) {
      return { success: false, message: "Only project owners and admins can update a project." };
    }

    const updates = {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.progress !== undefined ? { progress: parsed.data.progress } : {}),
      ...(parsed.data.dueDate !== undefined ? { due_date: parsed.data.dueDate || null } : {}),
    };

    const { error } = await supabase.from("projects").update(updates).eq("id", projectId);

    if (error) {
      return toActionErrorState({
        source: "projects.updateProject",
        message: "Project update failed during mutation.",
        userMessage: "Could not update the project right now.",
        error,
        context: {
          projectId,
          userId: access.userId,
          updates,
        },
      });
    }

    if (Object.keys(updates).length > 0) {
      await createAuditLog({
        actorId: access.userId,
        projectId,
        eventType: "project.updated",
        title: `Updated ${parsed.data.name ?? existingProject.name}`,
        description: "Project details, status, or timeline were updated.",
        metadata: updates,
      });
      await recordAnalyticsEvent({
        userId: access.userId,
        eventName: parsed.data.status === "completed" ? "project_completed" : "project_updated",
        value: parsed.data.progress ?? 1,
      });
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Project updated." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.updateProject",
      message: "Unexpected failure while updating project.",
      userMessage: "Could not update the project right now.",
      error,
      context: {
        projectId,
      },
    });
  }
}

export async function deleteProject(projectId: string): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireCurrentWorkspaceAccess();

    const { data: existingProject, error: existingProjectError } = await supabase
      .from("projects")
      .select("id,name,owner_id,status")
      .eq("id", projectId)
      .maybeSingle();

    if (existingProjectError) {
      return toActionErrorState({
        source: "projects.deleteProject",
        message: "Project lookup failed before delete.",
        userMessage: "Could not delete the project right now.",
        error: existingProjectError,
        context: {
          projectId,
          userId: access.userId,
        },
      });
    }

    if (!existingProject) {
      return { success: false, message: "Project not found or you no longer have access." };
    }

    if (access.role !== "admin" && existingProject.owner_id !== access.userId) {
      return { success: false, message: "Only project owners and admins can delete a project." };
    }

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      return toActionErrorState({
        source: "projects.deleteProject",
        message: "Project delete failed during mutation.",
        userMessage: "Could not delete the project right now.",
        error,
        context: {
          projectId,
          userId: access.userId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "project.deleted",
      title: `Deleted ${existingProject.name}`,
      description: `The ${existingProject.status} project was permanently removed from the workspace.`,
      metadata: {
        projectId,
        status: existingProject.status,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_deleted",
      value: 1,
    });

    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { success: true, message: "Project deleted." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.deleteProject",
      message: "Unexpected failure while deleting project.",
      userMessage: "Could not delete the project right now.",
      error,
      context: {
        projectId,
      },
    });
  }
}

export async function addProjectMember(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = memberSchema.safeParse({
      userId: formData.get("userId"),
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const supabase = await createSupabaseServerClient();
    const access = await requireCurrentWorkspaceAccess();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,name,owner_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return toActionErrorState({
        source: "projects.addProjectMember",
        message: "Project lookup failed before membership insert.",
        userMessage: "Could not add the member right now.",
        error: projectError,
        context: { projectId, userId: access.userId, targetUserId: parsed.data.userId },
      });
    }

    if (!project) {
      return { success: false, message: "Project not found or you no longer have access." };
    }

    if (access.role !== "admin" && project.owner_id !== access.userId) {
      return { success: false, message: "Only project owners and admins can manage collaborators." };
    }

    if (parsed.data.userId === project.owner_id) {
      return { success: false, message: "The project owner already has access." };
    }

    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .eq("id", parsed.data.userId)
      .maybeSingle();

    if (memberError) {
      return toActionErrorState({
        source: "projects.addProjectMember",
        message: "Member lookup failed before membership insert.",
        userMessage: "Could not add the member right now.",
        error: memberError,
        context: { projectId, userId: access.userId, targetUserId: parsed.data.userId },
      });
    }

    if (!member) {
      return { success: false, message: "Selected team member was not found." };
    }

    const { error } = await supabase.from("project_members").upsert({
      project_id: projectId,
      user_id: parsed.data.userId,
    });

    if (error) {
      return toActionErrorState({
        source: "projects.addProjectMember",
        message: "Membership insert failed during mutation.",
        userMessage: "Could not add the member right now.",
        error,
        context: { projectId, userId: access.userId, targetUserId: parsed.data.userId },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.member_added",
      title: `Added ${member.full_name ?? member.email ?? "collaborator"} to ${project.name}`,
      description: "Project access was granted to a new collaborator.",
      metadata: {
        targetUserId: member.id,
        email: member.email,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_member_added",
      value: 1,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { success: true, message: "Collaborator added." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.addProjectMember",
      message: "Unexpected failure while adding project member.",
      userMessage: "Could not add the member right now.",
      error,
      context: { projectId },
    });
  }
}

export async function removeProjectMember(projectId: string, userId: string): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireCurrentWorkspaceAccess();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,name,owner_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return toActionErrorState({
        source: "projects.removeProjectMember",
        message: "Project lookup failed before membership delete.",
        userMessage: "Could not remove the member right now.",
        error: projectError,
        context: { projectId, userId: access.userId, targetUserId: userId },
      });
    }

    if (!project) {
      return { success: false, message: "Project not found or you no longer have access." };
    }

    if (access.role !== "admin" && project.owner_id !== access.userId) {
      return { success: false, message: "Only project owners and admins can manage collaborators." };
    }

    if (userId === project.owner_id) {
      return { success: false, message: "The project owner cannot be removed from access." };
    }

    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .eq("id", userId)
      .maybeSingle();

    if (memberError) {
      return toActionErrorState({
        source: "projects.removeProjectMember",
        message: "Member lookup failed before membership delete.",
        userMessage: "Could not remove the member right now.",
        error: memberError,
        context: { projectId, userId: access.userId, targetUserId: userId },
      });
    }

    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      return toActionErrorState({
        source: "projects.removeProjectMember",
        message: "Membership delete failed during mutation.",
        userMessage: "Could not remove the member right now.",
        error,
        context: { projectId, userId: access.userId, targetUserId: userId },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.member_removed",
      title: `Removed ${member?.full_name ?? member?.email ?? "collaborator"} from ${project.name}`,
      description: "Project access was revoked for a collaborator.",
      metadata: {
        targetUserId: userId,
        email: member?.email ?? null,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_member_removed",
      value: 1,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { success: true, message: "Collaborator removed." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.removeProjectMember",
      message: "Unexpected failure while removing project member.",
      userMessage: "Could not remove the member right now.",
      error,
      context: { projectId, targetUserId: userId },
    });
  }
}
