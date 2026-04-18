"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { toActionErrorState } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { createReportExportRecord } from "@/lib/report-exports";
import { requireCurrentWorkspaceAccess } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const saveViewSchema = z.object({
  name: z.string().trim().min(2, "View name must be at least 2 characters.").max(50, "View name must be 50 characters or fewer."),
  range: z.coerce.number().refine((value) => [7, 30, 90].includes(value), "Select a valid time range."),
  category: z.enum(["all", "conversions", "projects", "team", "billing"]),
});

const scheduleReportSchema = z.object({
  name: z.string().trim().min(2, "Report name must be at least 2 characters.").max(60, "Report name must be 60 characters or fewer."),
  recipientEmail: z.string().trim().email("Enter a valid recipient email."),
  range: z.coerce.number().refine((value) => [7, 30, 90].includes(value), "Select a valid time range."),
  category: z.enum(["all", "conversions", "projects", "team", "billing"]),
  format: z.enum(["csv", "pdf"]),
  cadence: z.enum(["weekly", "monthly"]),
});

function withFieldErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function getNextRunAt(cadence: "weekly" | "monthly") {
  const next = new Date();

  if (cadence === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

export async function saveAnalyticsView(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = saveViewSchema.safeParse({
      name: formData.get("name"),
      range: formData.get("range"),
      category: formData.get("category"),
    });

    if (!parsed.success) {
      return withFieldErrors(parsed.error);
    }

    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("analytics_saved_views").insert({
      owner_id: access.userId,
      name: parsed.data.name,
      range: parsed.data.range as 7 | 30 | 90,
      category: parsed.data.category,
    });

    if (error) {
      return toActionErrorState({
        source: "analytics.saveView",
        message: "Analytics saved view insert failed.",
        userMessage: "Could not save the report view right now.",
        error,
        context: {
          userId: access.userId,
          name: parsed.data.name,
          range: parsed.data.range,
          category: parsed.data.category,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "analytics.saved_view_created",
      title: `Saved analytics view ${parsed.data.name}`,
      description: `Saved a ${parsed.data.category} analytics view for ${parsed.data.range} days.`,
      metadata: {
        name: parsed.data.name,
        range: parsed.data.range,
        category: parsed.data.category,
      },
    });

    revalidatePath("/analytics");
    return { success: true, message: "Saved analytics view." };
  } catch (error) {
    return toActionErrorState({
      source: "analytics.saveView",
      message: "Unexpected failure while saving analytics view.",
      userMessage: "Could not save the report view right now.",
      error,
    });
  }
}

export async function deleteAnalyticsView(viewId: string): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase
      .from("analytics_saved_views")
      .select("id,name,owner_id")
      .eq("id", viewId)
      .maybeSingle();

    if (lookupError) {
      return toActionErrorState({
        source: "analytics.deleteView.lookup",
        message: "Analytics saved view lookup failed.",
        userMessage: "Could not remove the saved report right now.",
        error: lookupError,
        context: {
          userId: access.userId,
          viewId,
        },
      });
    }

    if (!existing || existing.owner_id !== access.userId) {
      return { success: false, message: "Saved report not found." };
    }

    const { error } = await supabase.from("analytics_saved_views").delete().eq("id", viewId);

    if (error) {
      return toActionErrorState({
        source: "analytics.deleteView",
        message: "Analytics saved view delete failed.",
        userMessage: "Could not remove the saved report right now.",
        error,
        context: {
          userId: access.userId,
          viewId,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "analytics.saved_view_deleted",
      title: `Deleted analytics view ${existing.name}`,
      description: "A saved analytics report configuration was removed.",
      metadata: {
        name: existing.name,
        viewId: existing.id,
      },
    });

    revalidatePath("/analytics");
    return { success: true, message: "Saved report removed." };
  } catch (error) {
    return toActionErrorState({
      source: "analytics.deleteView",
      message: "Unexpected failure while deleting analytics view.",
      userMessage: "Could not remove the saved report right now.",
      error,
      context: {
        viewId,
      },
    });
  }
}

export async function createScheduledAnalyticsReport(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = scheduleReportSchema.safeParse({
      name: formData.get("name"),
      recipientEmail: formData.get("recipientEmail"),
      range: formData.get("range"),
      category: formData.get("category"),
      format: formData.get("format"),
      cadence: formData.get("cadence"),
    });

    if (!parsed.success) {
      return withFieldErrors(parsed.error);
    }

    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("scheduled_reports").insert({
      owner_id: access.userId,
      name: parsed.data.name,
      recipient_email: parsed.data.recipientEmail,
      range: parsed.data.range as 7 | 30 | 90,
      category: parsed.data.category,
      format: parsed.data.format,
      cadence: parsed.data.cadence,
      next_run_at: getNextRunAt(parsed.data.cadence),
      report_kind: "analytics",
    });

    if (error) {
      return toActionErrorState({
        source: "analytics.createScheduledReport",
        message: "Scheduled analytics report insert failed.",
        userMessage: "Could not save the scheduled report right now.",
        error,
        context: {
          userId: access.userId,
          name: parsed.data.name,
          recipientEmail: parsed.data.recipientEmail,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "analytics.schedule_created",
      title: `Scheduled analytics report ${parsed.data.name}`,
      description: `Scheduled a ${parsed.data.cadence} ${parsed.data.category} report for ${parsed.data.recipientEmail}.`,
      metadata: {
        name: parsed.data.name,
        recipientEmail: parsed.data.recipientEmail,
        range: parsed.data.range,
        category: parsed.data.category,
        format: parsed.data.format,
        cadence: parsed.data.cadence,
      },
    });

    revalidatePath("/analytics");
    return { success: true, message: "Scheduled report saved." };
  } catch (error) {
    return toActionErrorState({
      source: "analytics.createScheduledReport",
      message: "Unexpected failure while saving scheduled analytics report.",
      userMessage: "Could not save the scheduled report right now.",
      error,
    });
  }
}

export async function toggleScheduledAnalyticsReport(scheduleId: string, active: boolean): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase
      .from("scheduled_reports")
      .select("id,name,owner_id,active,cadence")
      .eq("id", scheduleId)
      .maybeSingle();

    if (lookupError) {
      return toActionErrorState({
        source: "analytics.toggleScheduledReport.lookup",
        message: "Scheduled analytics report lookup failed.",
        userMessage: "Could not update the scheduled report right now.",
        error: lookupError,
        context: { userId: access.userId, scheduleId, active },
      });
    }

    if (!existing || existing.owner_id !== access.userId) {
      return { success: false, message: "Scheduled report not found." };
    }

    const { error } = await supabase
      .from("scheduled_reports")
      .update({
        active,
        next_run_at: active ? getNextRunAt(existing.cadence) : new Date().toISOString(),
      })
      .eq("id", scheduleId);

    if (error) {
      return toActionErrorState({
        source: "analytics.toggleScheduledReport",
        message: "Scheduled analytics report update failed.",
        userMessage: "Could not update the scheduled report right now.",
        error,
        context: { userId: access.userId, scheduleId, active },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: active ? "analytics.schedule_enabled" : "analytics.schedule_paused",
      title: `${active ? "Enabled" : "Paused"} scheduled report ${existing.name}`,
      description: `Scheduled analytics delivery was ${active ? "enabled" : "paused"}.`,
      metadata: { scheduleId, active },
    });

    revalidatePath("/analytics");
    return { success: true, message: active ? "Scheduled report enabled." : "Scheduled report paused." };
  } catch (error) {
    return toActionErrorState({
      source: "analytics.toggleScheduledReport",
      message: "Unexpected failure while updating scheduled analytics report.",
      userMessage: "Could not update the scheduled report right now.",
      error,
      context: { scheduleId, active },
    });
  }
}

export async function deleteScheduledAnalyticsReport(scheduleId: string): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase
      .from("scheduled_reports")
      .select("id,name,owner_id")
      .eq("id", scheduleId)
      .maybeSingle();

    if (lookupError) {
      return toActionErrorState({
        source: "analytics.deleteScheduledReport.lookup",
        message: "Scheduled analytics report lookup failed.",
        userMessage: "Could not remove the scheduled report right now.",
        error: lookupError,
        context: { userId: access.userId, scheduleId },
      });
    }

    if (!existing || existing.owner_id !== access.userId) {
      return { success: false, message: "Scheduled report not found." };
    }

    const { error } = await supabase.from("scheduled_reports").delete().eq("id", scheduleId);

    if (error) {
      return toActionErrorState({
        source: "analytics.deleteScheduledReport",
        message: "Scheduled analytics report delete failed.",
        userMessage: "Could not remove the scheduled report right now.",
        error,
        context: { userId: access.userId, scheduleId },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "analytics.schedule_deleted",
      title: `Deleted scheduled report ${existing.name}`,
      description: "A scheduled analytics delivery configuration was removed.",
      metadata: { scheduleId, name: existing.name },
    });

    revalidatePath("/analytics");
    return { success: true, message: "Scheduled report removed." };
  } catch (error) {
    return toActionErrorState({
      source: "analytics.deleteScheduledReport",
      message: "Unexpected failure while deleting scheduled analytics report.",
      userMessage: "Could not remove the scheduled report right now.",
      error,
      context: { scheduleId },
    });
  }
}

export async function runScheduledAnalyticsReportNow(scheduleId: string): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();
    const { data: schedule, error: lookupError } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("id", scheduleId)
      .maybeSingle();

    if (lookupError) {
      return toActionErrorState({
        source: "analytics.runScheduledReport.lookup",
        message: "Scheduled analytics report lookup failed.",
        userMessage: "Could not run the scheduled report right now.",
        error: lookupError,
        context: { userId: access.userId, scheduleId },
      });
    }

    if (!schedule || schedule.owner_id !== access.userId) {
      return { success: false, message: "Scheduled report not found." };
    }

    const now = new Date().toISOString();

    await createReportExportRecord({
      ownerId: access.userId,
      title: `${schedule.name} delivery`,
      reportKind: "analytics",
      format: schedule.format,
      filters: {
        range: schedule.range,
        category: schedule.category,
      },
    });

    await supabase.from("scheduled_report_runs").insert({
      schedule_id: schedule.id,
      owner_id: access.userId,
      recipient_email: schedule.recipient_email,
      report_format: schedule.format,
      range: schedule.range,
      category: schedule.category,
      status: "delivered",
      delivery_mode: "manual",
      delivered_at: now,
    });

    await supabase
      .from("scheduled_reports")
      .update({
        last_sent_at: now,
        next_run_at: getNextRunAt(schedule.cadence),
      })
      .eq("id", schedule.id);

    await createAuditLog({
      actorId: access.userId,
      eventType: "analytics.schedule_run_manual",
      title: `Ran scheduled report ${schedule.name}`,
      description: `Triggered a manual analytics delivery to ${schedule.recipient_email}.`,
      metadata: {
        scheduleId: schedule.id,
        recipientEmail: schedule.recipient_email,
        format: schedule.format,
        cadence: schedule.cadence,
      },
    });

    await createNotification({
      userId: access.userId,
      title: "Scheduled report delivered",
      message: `${schedule.name} was generated for ${schedule.recipient_email}.`,
      type: "system",
      targetPath: "/analytics",
    });

    revalidatePath("/analytics");
    return { success: true, message: "Scheduled report delivered." };
  } catch (error) {
    return toActionErrorState({
      source: "analytics.runScheduledReport",
      message: "Unexpected failure while running scheduled analytics report.",
      userMessage: "Could not run the scheduled report right now.",
      error,
      context: { scheduleId },
    });
  }
}
