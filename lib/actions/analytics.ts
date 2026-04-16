"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { toActionErrorState } from "@/lib/logger";
import { requireCurrentWorkspaceAccess } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const saveViewSchema = z.object({
  name: z.string().trim().min(2, "View name must be at least 2 characters.").max(50, "View name must be 50 characters or fewer."),
  range: z.coerce.number().refine((value) => [7, 30, 90].includes(value), "Select a valid time range."),
  category: z.enum(["all", "conversions", "projects", "team", "billing"]),
});

function withFieldErrors(error: z.ZodError): ActionState {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
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
