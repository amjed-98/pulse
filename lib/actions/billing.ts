"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { toActionErrorState } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { requireAdminAccess } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const billingSchema = z.object({
  plan: z.enum(["starter", "growth", "scale"]),
});

export async function updateWorkspacePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = billingSchema.safeParse({
      plan: formData.get("plan"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const access = await requireAdminAccess();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("workspace_billing").upsert(
      {
        owner_id: access.userId,
        plan: parsed.data.plan,
        status: "active",
      },
      {
        onConflict: "owner_id",
      },
    );

    if (error) {
      return toActionErrorState({
        source: "billing.updateWorkspacePlan",
        message: "Workspace billing upsert failed during mutation.",
        userMessage: "Could not update the billing plan right now.",
        error,
        context: {
          userId: access.userId,
          plan: parsed.data.plan,
        },
      });
    }

    await createAuditLog({
      actorId: access.userId,
      eventType: "system.billing_updated",
      title: `Changed workspace plan to ${parsed.data.plan}`,
      description: "Workspace billing plan was updated from the settings page.",
      metadata: {
        plan: parsed.data.plan,
      },
    });
    await createNotification({
      userId: access.userId,
      type: "system",
      title: "Billing plan updated",
      message: `Workspace plan is now ${parsed.data.plan}.`,
      targetPath: "/settings",
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, message: "Billing plan updated." };
  } catch (error) {
    return toActionErrorState({
      source: "billing.updateWorkspacePlan",
      message: "Unexpected failure while updating billing plan.",
      userMessage: "Could not update the billing plan right now.",
      error,
    });
  }
}
