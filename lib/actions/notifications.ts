"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorState } from "@/lib/logger";
import { requireCurrentWorkspaceAccess } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function markNotificationRead(notificationId: string): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", access.userId)
      .is("read_at", null);

    if (error) {
      return toActionErrorState({
        source: "notifications.markNotificationRead",
        message: "Notification read update failed during mutation.",
        userMessage: "Could not mark the notification as read right now.",
        error,
        context: {
          notificationId,
          userId: access.userId,
        },
      });
    }

    revalidatePath("/", "layout");
    return { success: true, message: "Notification marked as read." };
  } catch (error) {
    return toActionErrorState({
      source: "notifications.markNotificationRead",
      message: "Unexpected failure while marking notification as read.",
      userMessage: "Could not mark the notification as read right now.",
      error,
      context: {
        notificationId,
      },
    });
  }
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  try {
    const access = await requireCurrentWorkspaceAccess();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", access.userId)
      .is("read_at", null);

    if (error) {
      return toActionErrorState({
        source: "notifications.markAllNotificationsRead",
        message: "Notification bulk read update failed during mutation.",
        userMessage: "Could not clear notifications right now.",
        error,
        context: {
          userId: access.userId,
        },
      });
    }

    revalidatePath("/", "layout");
    return { success: true, message: "Notifications cleared." };
  } catch (error) {
    return toActionErrorState({
      source: "notifications.markAllNotificationsRead",
      message: "Unexpected failure while clearing notifications.",
      userMessage: "Could not clear notifications right now.",
      error,
    });
  }
}
