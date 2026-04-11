"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { getWorkspaceBillingSummary } from "@/lib/billing";
import { toActionErrorState } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { requireAdminAccess } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureStripeCustomer, getStripeClient, getStripePriceIdForPlan, isStripeConfigured } from "@/lib/stripe";
import { getCurrentProfile } from "@/lib/data";
import type { ActionState } from "@/lib/types";
import { publicEnv } from "@/lib/env";

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

export async function startStripeCheckout(plan: "growth" | "scale") {
  try {
    const access = await requireAdminAccess();

    if (!isStripeConfigured()) {
      redirect("/settings?billing=stripe-unavailable");
    }

    const [billing, profile] = await Promise.all([getWorkspaceBillingSummary(access.userId), getCurrentProfile()]);

    if (!profile) {
      redirect("/login");
    }

    const priceId = getStripePriceIdForPlan(plan);

    if (!priceId) {
      redirect("/settings?billing=stripe-unavailable");
    }

    const stripe = getStripeClient();
    const customerId = await ensureStripeCustomer({
      existingCustomerId: billing.billing.stripe_customer_id,
      ownerId: access.userId,
      profile,
    });
    const supabase = await createSupabaseServerClient();

    await supabase.from("workspace_billing").upsert(
      {
        owner_id: access.userId,
        stripe_customer_id: customerId,
      },
      { onConflict: "owner_id" },
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: access.userId,
      allow_promotion_codes: true,
      success_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/settings?billing=success`,
      cancel_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/settings?billing=canceled`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        owner_id: access.userId,
        plan,
      },
      subscription_data: {
        metadata: {
          owner_id: access.userId,
          plan,
        },
      },
    });

    if (!session.url) {
      redirect("/settings?billing=stripe-unavailable");
    }

    redirect(session.url);
  } catch (error) {
    unstable_rethrow(error);
    redirect("/settings?billing=error");
  }
}

export async function openStripeBillingPortal() {
  try {
    const access = await requireAdminAccess();

    if (!isStripeConfigured()) {
      redirect("/settings?billing=stripe-unavailable");
    }

    const billing = await getWorkspaceBillingSummary(access.userId);

    if (!billing.billing.stripe_customer_id) {
      redirect("/settings?billing=portal-unavailable");
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.billing.stripe_customer_id,
      return_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/settings?billing=portal-return`,
    });

    redirect(session.url);
  } catch (error) {
    unstable_rethrow(error);
    redirect("/settings?billing=error");
  }
}
