"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAnalyticsEvent } from "@/lib/analytics";
import { createAuditLog } from "@/lib/audit";
import { buildPlanLimitPayload, getStorageLimitBytes, getWorkspaceBillingSummary } from "@/lib/billing";
import { toActionErrorState } from "@/lib/logger";
import { createNotification, createNotifications } from "@/lib/notifications";
import { requireCurrentWorkspaceAccess } from "@/lib/permissions";
import {
  MAX_PROJECT_ASSET_FILE_SIZE,
  PROJECT_ASSET_BUCKET,
  PROJECT_ATTACHMENT_MIME_TYPES,
  PROJECT_COVER_MIME_TYPES,
  buildProjectAssetObjectPath,
} from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState, ProjectMilestoneStatus, ProjectTaskPriority } from "@/lib/types";

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

const assetSchema = z.object({
  assetType: z.enum(["cover", "attachment"]),
});

const milestoneSchema = z.object({
  title: z.string().min(2, "Milestone title must be at least 2 characters."),
  notes: z.string().max(500, "Notes must be 500 characters or fewer.").optional(),
  status: z.enum(["planned", "in_progress", "completed"]),
  dueDate: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters."),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assigneeId: z.string().uuid("Select a valid assignee.").optional().or(z.literal("")),
  dueDate: z.string().optional(),
});

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty.").max(2000, "Comment must be 2000 characters or fewer."),
  taskId: z.string().uuid("Select a valid task.").optional().or(z.literal("")),
});

function mapErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

async function requireManageableProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const access = await requireCurrentWorkspaceAccess();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return {
      supabase,
      access,
      project: null,
      error: await toActionErrorState({
        source: "projects.requireManageableProject",
        message: "Project lookup failed while checking permissions.",
        userMessage: "Could not complete the project action right now.",
        error,
        context: {
          projectId,
          userId: access.userId,
        },
      }),
    };
  }

  if (!project) {
    return {
      supabase,
      access,
      project: null,
      error: { success: false, message: "Project not found or you no longer have access." } satisfies ActionState,
    };
  }

  if (access.role !== "admin" && project.owner_id !== access.userId) {
    return {
      supabase,
      access,
      project: null,
      error: { success: false, message: "Only project owners and admins can manage project assets." } satisfies ActionState,
    };
  }

  return { supabase, access, project, error: null };
}

function milestoneStatusLabel(status: ProjectMilestoneStatus) {
  return status.replace("_", " ");
}

function taskPriorityLabel(priority: ProjectTaskPriority) {
  return priority;
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
    const billing = await getWorkspaceBillingSummary(access.userId);

    if (billing.usage.projectsUsed >= billing.plan.limits.projects) {
      return {
        success: false,
        message: `The ${billing.plan.name} plan supports up to ${billing.plan.limits.projects} projects. Upgrade to add more.`,
        payload: buildPlanLimitPayload({
          resource: "projects",
          currentPlan: billing.billing.plan,
          used: billing.usage.projectsUsed,
          limit: billing.plan.limits.projects,
        }),
      };
    }

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
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Project created",
      message: `${project.name} is now live in the workspace.`,
      targetPath: `/projects/${project.id}`,
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
      await createNotification({
        userId: access.userId,
        type: "project",
        title: "Project updated",
        message: `${parsed.data.name ?? existingProject.name} was updated.`,
        targetPath: `/projects/${projectId}`,
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

    const { data: existingAssets } = await supabase
      .from("project_assets")
      .select("object_path")
      .eq("project_id", projectId);

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

    if (existingAssets?.length) {
      await supabase.storage.from(PROJECT_ASSET_BUCKET).remove(existingAssets.map((asset) => asset.object_path));
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
    await createNotifications([
      {
        userId: access.userId,
        type: "project",
        title: "Collaborator added",
        message: `${member.full_name ?? member.email ?? "A collaborator"} was added to ${project.name}.`,
        targetPath: `/projects/${projectId}`,
      },
      {
        userId: member.id,
        type: "project",
        title: "Added to project",
        message: `You now have access to ${project.name}.`,
        targetPath: `/projects/${projectId}`,
      },
    ]);

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
    if (member?.id) {
      await createNotifications([
        {
          userId: access.userId,
          type: "project",
          title: "Collaborator removed",
          message: `${member.full_name ?? member.email ?? "A collaborator"} was removed from ${project.name}.`,
          targetPath: `/projects/${projectId}`,
        },
        {
          userId: member.id,
          type: "project",
          title: "Project access removed",
          message: `Your access to ${project.name} was removed.`,
          targetPath: "/projects",
        },
      ]);
    }

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

export async function uploadProjectAsset(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = assetSchema.safeParse({
      assetType: formData.get("assetType"),
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const assetFileEntry = formData.get("assetFile");
    const assetFile = assetFileEntry instanceof File && assetFileEntry.size > 0 ? assetFileEntry : null;

    if (!assetFile) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          assetFile: ["Select a file to upload."],
        },
      };
    }

    if (assetFile.size > MAX_PROJECT_ASSET_FILE_SIZE) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          assetFile: ["Project assets must be 20 MB or smaller."],
        },
      };
    }

    const allowedMimeTypes: readonly string[] =
      parsed.data.assetType === "cover" ? PROJECT_COVER_MIME_TYPES : PROJECT_ATTACHMENT_MIME_TYPES;

    if (!allowedMimeTypes.includes(assetFile.type)) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          assetFile: [
            parsed.data.assetType === "cover"
              ? "Cover images must be PNG, JPG, WEBP, or GIF."
              : "Attachments must be a supported image, document, or text file.",
          ],
        },
      };
    }

    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const billing = await getWorkspaceBillingSummary(access.userId);
    const storageLimitBytes = getStorageLimitBytes(billing.billing.plan);

    if (billing.usage.storageBytesUsed + assetFile.size > storageLimitBytes) {
      return {
        success: false,
        message: `${billing.plan.name} includes ${billing.plan.limits.storageMb} MB of file storage. Upgrade to upload more assets.`,
        payload: buildPlanLimitPayload({
          resource: "storage",
          currentPlan: billing.billing.plan,
          used: Math.round((billing.usage.storageBytesUsed + assetFile.size) / (1024 * 1024)),
          limit: billing.plan.limits.storageMb,
        }),
      };
    }

    let previousCoverObjectPath: string | null = null;

    if (parsed.data.assetType === "cover") {
      const { data: existingCover } = await supabase
        .from("project_assets")
        .select("id,object_path")
        .eq("project_id", projectId)
        .eq("asset_type", "cover")
        .maybeSingle();

      previousCoverObjectPath = existingCover?.object_path ?? null;

      if (existingCover) {
        await supabase.from("project_assets").delete().eq("id", existingCover.id);
      }
    }

    const objectPath = buildProjectAssetObjectPath(projectId, assetFile, parsed.data.assetType);
    const uploadResult = await supabase.storage
      .from(PROJECT_ASSET_BUCKET)
      .upload(objectPath, new Uint8Array(await assetFile.arrayBuffer()), {
        cacheControl: "3600",
        contentType: assetFile.type,
        upsert: false,
      });

    if (uploadResult.error) {
      return toActionErrorState({
        source: "projects.uploadProjectAsset",
        message: "Project asset upload failed in Supabase storage.",
        userMessage: "Could not upload the asset right now.",
        error: uploadResult.error,
        context: {
          projectId,
          userId: access.userId,
          assetType: parsed.data.assetType,
          fileName: assetFile.name,
        },
      });
    }

    const { error: insertError } = await supabase.from("project_assets").insert({
      project_id: projectId,
      uploaded_by: access.userId,
      asset_type: parsed.data.assetType,
      file_name: assetFile.name,
      file_size: assetFile.size,
      object_path: objectPath,
      content_type: assetFile.type,
    });

    if (insertError) {
      await supabase.storage.from(PROJECT_ASSET_BUCKET).remove([objectPath]);
      return toActionErrorState({
        source: "projects.uploadProjectAsset",
        message: "Project asset metadata insert failed.",
        userMessage: "Could not upload the asset right now.",
        error: insertError,
        context: {
          projectId,
          userId: access.userId,
          assetType: parsed.data.assetType,
          fileName: assetFile.name,
        },
      });
    }

    if (previousCoverObjectPath) {
      await supabase.storage.from(PROJECT_ASSET_BUCKET).remove([previousCoverObjectPath]);
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: parsed.data.assetType === "cover" ? `Updated ${project.name} cover` : `Uploaded asset to ${project.name}`,
      description:
        parsed.data.assetType === "cover"
          ? "The project cover image was replaced."
          : "A project attachment was added for collaboration.",
      metadata: {
        assetType: parsed.data.assetType,
        fileName: assetFile.name,
        fileSize: assetFile.size,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: parsed.data.assetType === "cover" ? "project_cover_uploaded" : "project_asset_uploaded",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: parsed.data.assetType === "cover" ? "Cover updated" : "Attachment uploaded",
      message:
        parsed.data.assetType === "cover"
          ? `${project.name} cover image was updated.`
          : `${assetFile.name} was uploaded to ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: parsed.data.assetType === "cover" ? "Project cover updated." : "Attachment uploaded.",
    };
  } catch (error) {
    return toActionErrorState({
      source: "projects.uploadProjectAsset",
      message: "Unexpected failure while uploading project asset.",
      userMessage: "Could not upload the asset right now.",
      error,
      context: { projectId },
    });
  }
}

export async function deleteProjectAsset(projectId: string, assetId: string): Promise<ActionState> {
  try {
    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const { data: asset, error: assetError } = await supabase
      .from("project_assets")
      .select("id,file_name,object_path,asset_type")
      .eq("project_id", projectId)
      .eq("id", assetId)
      .maybeSingle();

    if (assetError) {
      return toActionErrorState({
        source: "projects.deleteProjectAsset",
        message: "Project asset lookup failed before delete.",
        userMessage: "Could not delete the asset right now.",
        error: assetError,
        context: { projectId, assetId, userId: access.userId },
      });
    }

    if (!asset) {
      return { success: false, message: "Asset not found or already removed." };
    }

    const { error: deleteError } = await supabase.from("project_assets").delete().eq("id", assetId);

    if (deleteError) {
      return toActionErrorState({
        source: "projects.deleteProjectAsset",
        message: "Project asset delete failed during mutation.",
        userMessage: "Could not delete the asset right now.",
        error: deleteError,
        context: { projectId, assetId, userId: access.userId },
      });
    }

    await supabase.storage.from(PROJECT_ASSET_BUCKET).remove([asset.object_path]);

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Removed asset from ${project.name}`,
      description: "A project file was removed from the workspace.",
      metadata: {
        assetId,
        assetType: asset.asset_type,
        fileName: asset.file_name,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_asset_deleted",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Asset removed",
      message: `${asset.file_name} was removed from ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { success: true, message: "Asset deleted." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.deleteProjectAsset",
      message: "Unexpected failure while deleting project asset.",
      userMessage: "Could not delete the asset right now.",
      error,
      context: { projectId, assetId },
    });
  }
}

export async function createProjectMilestone(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = milestoneSchema.safeParse({
      title: formData.get("title"),
      notes: formData.get("notes") ?? "",
      status: formData.get("status") ?? "planned",
      dueDate: formData.get("dueDate") ?? "",
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const { error: insertError } = await supabase.from("project_milestones").insert({
      project_id: projectId,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
      due_date: parsed.data.dueDate || null,
    });

    if (insertError) {
      return toActionErrorState({
        source: "projects.createProjectMilestone",
        message: "Project milestone insert failed during mutation.",
        userMessage: "Could not create the milestone right now.",
        error: insertError,
        context: { projectId, userId: access.userId, title: parsed.data.title },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Added milestone to ${project.name}`,
      description: `A ${milestoneStatusLabel(parsed.data.status)} milestone was added to the delivery plan.`,
      metadata: {
        title: parsed.data.title,
        status: parsed.data.status,
        dueDate: parsed.data.dueDate || null,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_milestone_created",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Milestone created",
      message: `${parsed.data.title} was added to ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Milestone created." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.createProjectMilestone",
      message: "Unexpected failure while creating project milestone.",
      userMessage: "Could not create the milestone right now.",
      error,
      context: { projectId },
    });
  }
}

export async function updateProjectMilestone(
  projectId: string,
  milestoneId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = milestoneSchema.partial().safeParse({
      title: formData.get("title") ?? undefined,
      notes: formData.get("notes") ?? undefined,
      status: formData.get("status") ?? undefined,
      dueDate: formData.get("dueDate") ?? undefined,
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const updates = {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.dueDate !== undefined ? { due_date: parsed.data.dueDate || null } : {}),
    };

    const { error: updateError } = await supabase
      .from("project_milestones")
      .update(updates)
      .eq("project_id", projectId)
      .eq("id", milestoneId);

    if (updateError) {
      return toActionErrorState({
        source: "projects.updateProjectMilestone",
        message: "Project milestone update failed during mutation.",
        userMessage: "Could not update the milestone right now.",
        error: updateError,
        context: { projectId, milestoneId, userId: access.userId, updates },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Updated milestone in ${project.name}`,
      description: "A project milestone changed state or schedule.",
      metadata: {
        milestoneId,
        ...updates,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: parsed.data.status === "completed" ? "project_milestone_completed" : "project_milestone_updated",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Milestone updated",
      message: `A milestone in ${project.name} was updated.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Milestone updated." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.updateProjectMilestone",
      message: "Unexpected failure while updating project milestone.",
      userMessage: "Could not update the milestone right now.",
      error,
      context: { projectId, milestoneId },
    });
  }
}

export async function deleteProjectMilestone(projectId: string, milestoneId: string): Promise<ActionState> {
  try {
    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("title,status")
      .eq("project_id", projectId)
      .eq("id", milestoneId)
      .maybeSingle();

    const { error: deleteError } = await supabase
      .from("project_milestones")
      .delete()
      .eq("project_id", projectId)
      .eq("id", milestoneId);

    if (deleteError) {
      return toActionErrorState({
        source: "projects.deleteProjectMilestone",
        message: "Project milestone delete failed during mutation.",
        userMessage: "Could not delete the milestone right now.",
        error: deleteError,
        context: { projectId, milestoneId, userId: access.userId },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Removed milestone from ${project.name}`,
      description: "A milestone was removed from the delivery plan.",
      metadata: {
        milestoneId,
        title: milestone?.title ?? null,
        status: milestone?.status ?? null,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_milestone_deleted",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Milestone removed",
      message: `${milestone?.title ?? "A milestone"} was removed from ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Milestone deleted." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.deleteProjectMilestone",
      message: "Unexpected failure while deleting project milestone.",
      userMessage: "Could not delete the milestone right now.",
      error,
      context: { projectId, milestoneId },
    });
  }
}

export async function createProjectTask(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = taskSchema.safeParse({
      title: formData.get("title"),
      status: formData.get("status") ?? "todo",
      priority: formData.get("priority") ?? "medium",
      assigneeId: formData.get("assigneeId") ?? "",
      dueDate: formData.get("dueDate") ?? "",
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const { error: insertError } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      title: parsed.data.title,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignee_id: parsed.data.assigneeId || null,
      due_date: parsed.data.dueDate || null,
    });

    if (insertError) {
      return toActionErrorState({
        source: "projects.createProjectTask",
        message: "Project task insert failed during mutation.",
        userMessage: "Could not create the task right now.",
        error: insertError,
        context: { projectId, userId: access.userId, title: parsed.data.title },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Added task to ${project.name}`,
      description: `A ${taskPriorityLabel(parsed.data.priority)} priority task entered the delivery queue.`,
      metadata: {
        title: parsed.data.title,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: parsed.data.dueDate || null,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_task_created",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Task created",
      message: `${parsed.data.title} was added to ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });
    if (parsed.data.assigneeId && parsed.data.assigneeId !== access.userId) {
      await createNotification({
        userId: parsed.data.assigneeId,
        type: "project",
        title: "Task assigned",
        message: `You were assigned "${parsed.data.title}" in ${project.name}.`,
        targetPath: `/projects/${projectId}`,
      });
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Task created." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.createProjectTask",
      message: "Unexpected failure while creating project task.",
      userMessage: "Could not create the task right now.",
      error,
      context: { projectId },
    });
  }
}

export async function updateProjectTask(
  projectId: string,
  taskId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = taskSchema.partial().safeParse({
      title: formData.get("title") ?? undefined,
      status: formData.get("status") ?? undefined,
      priority: formData.get("priority") ?? undefined,
      assigneeId: formData.get("assigneeId") ?? undefined,
      dueDate: formData.get("dueDate") ?? undefined,
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const updates = {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.assigneeId !== undefined ? { assignee_id: parsed.data.assigneeId || null } : {}),
      ...(parsed.data.dueDate !== undefined ? { due_date: parsed.data.dueDate || null } : {}),
    };

    const { error: updateError } = await supabase
      .from("project_tasks")
      .update(updates)
      .eq("project_id", projectId)
      .eq("id", taskId);

    if (updateError) {
      return toActionErrorState({
        source: "projects.updateProjectTask",
        message: "Project task update failed during mutation.",
        userMessage: "Could not update the task right now.",
        error: updateError,
        context: { projectId, taskId, userId: access.userId, updates },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Updated task in ${project.name}`,
      description: "A project task changed status, ownership, or timing.",
      metadata: {
        taskId,
        ...updates,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: parsed.data.status === "done" ? "project_task_completed" : "project_task_updated",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Task updated",
      message: `A task in ${project.name} was updated.`,
      targetPath: `/projects/${projectId}`,
    });
    if (parsed.data.assigneeId && parsed.data.assigneeId !== access.userId) {
      await createNotification({
        userId: parsed.data.assigneeId,
        type: "project",
        title: "Task updated",
        message: `A task assigned to you in ${project.name} was updated.`,
        targetPath: `/projects/${projectId}`,
      });
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Task updated." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.updateProjectTask",
      message: "Unexpected failure while updating project task.",
      userMessage: "Could not update the task right now.",
      error,
      context: { projectId, taskId },
    });
  }
}

export async function deleteProjectTask(projectId: string, taskId: string): Promise<ActionState> {
  try {
    const { supabase, access, project, error } = await requireManageableProject(projectId);

    if (error || !project) {
      return error ?? { success: false, message: "Project not found or you no longer have access." };
    }

    const { data: task } = await supabase
      .from("project_tasks")
      .select("title,status,priority")
      .eq("project_id", projectId)
      .eq("id", taskId)
      .maybeSingle();

    const { error: deleteError } = await supabase
      .from("project_tasks")
      .delete()
      .eq("project_id", projectId)
      .eq("id", taskId);

    if (deleteError) {
      return toActionErrorState({
        source: "projects.deleteProjectTask",
        message: "Project task delete failed during mutation.",
        userMessage: "Could not delete the task right now.",
        error: deleteError,
        context: { projectId, taskId, userId: access.userId },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Removed task from ${project.name}`,
      description: "A task was removed from the delivery queue.",
      metadata: {
        taskId,
        title: task?.title ?? null,
        status: task?.status ?? null,
        priority: task?.priority ?? null,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_task_deleted",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Task removed",
      message: `${task?.title ?? "A task"} was removed from ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Task deleted." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.deleteProjectTask",
      message: "Unexpected failure while deleting project task.",
      userMessage: "Could not delete the task right now.",
      error,
      context: { projectId, taskId },
    });
  }
}

export async function createProjectComment(
  projectId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = commentSchema.safeParse({
      body: formData.get("body"),
      taskId: formData.get("taskId") ?? "",
    });

    if (!parsed.success) {
      return mapErrors(parsed.error);
    }

    const supabase = await createSupabaseServerClient();
    const access = await requireCurrentWorkspaceAccess();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,name")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return toActionErrorState({
        source: "projects.createProjectComment",
        message: "Project lookup failed before comment insert.",
        userMessage: "Could not post the comment right now.",
        error: projectError,
        context: { projectId, userId: access.userId },
      });
    }

    if (!project) {
      return { success: false, message: "Project not found or you no longer have access." };
    }

    const { error } = await supabase.from("project_comments").insert({
      project_id: projectId,
      task_id: parsed.data.taskId || null,
      author_id: access.userId,
      body: parsed.data.body,
    });

    if (error) {
      return toActionErrorState({
        source: "projects.createProjectComment",
        message: "Project comment insert failed during mutation.",
        userMessage: "Could not post the comment right now.",
        error,
        context: { projectId, userId: access.userId, taskId: parsed.data.taskId || null },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Commented on ${project.name}`,
      description: "A new project discussion comment was posted.",
      metadata: {
        taskId: parsed.data.taskId || null,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_comment_created",
      value: 1,
    });
    await createNotification({
      userId: access.userId,
      type: "project",
      title: "Comment posted",
      message: `Your comment was added to ${project.name}.`,
      targetPath: `/projects/${projectId}`,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Comment posted." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.createProjectComment",
      message: "Unexpected failure while creating project comment.",
      userMessage: "Could not post the comment right now.",
      error,
      context: { projectId },
    });
  }
}

export async function deleteProjectComment(projectId: string, commentId: string): Promise<ActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireCurrentWorkspaceAccess();
    const { data: comment, error: commentError } = await supabase
      .from("project_comments")
      .select("id,author_id,body")
      .eq("project_id", projectId)
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return toActionErrorState({
        source: "projects.deleteProjectComment",
        message: "Project comment lookup failed before delete.",
        userMessage: "Could not delete the comment right now.",
        error: commentError,
        context: { projectId, commentId, userId: access.userId },
      });
    }

    if (!comment) {
      return { success: false, message: "Comment not found or already removed." };
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id,name,owner_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return { success: false, message: "Project not found or you no longer have access." };
    }

    const canDelete = access.role === "admin" || project.owner_id === access.userId || comment.author_id === access.userId;

    if (!canDelete) {
      return { success: false, message: "Only the author, project owner, or an admin can remove comments." };
    }

    const { error } = await supabase
      .from("project_comments")
      .delete()
      .eq("project_id", projectId)
      .eq("id", commentId);

    if (error) {
      return toActionErrorState({
        source: "projects.deleteProjectComment",
        message: "Project comment delete failed during mutation.",
        userMessage: "Could not delete the comment right now.",
        error,
        context: { projectId, commentId, userId: access.userId },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      projectId,
      eventType: "project.updated",
      title: `Removed comment from ${project.name}`,
      description: "A project discussion comment was removed.",
      metadata: {
        commentId,
      },
    });
    await recordAnalyticsEvent({
      userId: access.userId,
      eventName: "project_comment_deleted",
      value: 1,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Comment deleted." };
  } catch (error) {
    return toActionErrorState({
      source: "projects.deleteProjectComment",
      message: "Unexpected failure while deleting project comment.",
      userMessage: "Could not delete the comment right now.",
      error,
      context: { projectId, commentId },
    });
  }
}
