import type Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getWorkspacePlanFromPriceId, normalizeStripeSubscriptionStatus } from "@/lib/stripe";
import type { Database, WorkspacePlan } from "@/lib/types";

function resolveOwnerIdFromSubscription(subscription: Stripe.Subscription) {
  const metadataOwnerId = subscription.metadata.owner_id;

  if (metadataOwnerId) {
    return metadataOwnerId;
  }

  return null;
}

function resolvePeriodEnd(subscription: Stripe.Subscription) {
  void subscription;
  return null;
}

export async function syncWorkspaceBillingFromStripeSubscription(subscription: Stripe.Subscription) {
  const adminClient = await createSupabaseAdminClient();

  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to sync Stripe billing.");
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
  let ownerId = resolveOwnerIdFromSubscription(subscription);

  if (!ownerId && customerId) {
    const { data: billingRecord } = await adminClient
      .from("workspace_billing")
      .select("owner_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    ownerId = billingRecord?.owner_id ?? null;
  }

  if (!ownerId) {
    return { updated: false, ownerId: null };
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = (getWorkspacePlanFromPriceId(priceId) ?? "starter") as WorkspacePlan;
  const values: Database["public"]["Tables"]["workspace_billing"]["Insert"] = {
    owner_id: ownerId,
    plan,
    status: normalizeStripeSubscriptionStatus(subscription.status),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_end: resolvePeriodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };

  const { error } = await adminClient.from("workspace_billing").upsert(values, {
    onConflict: "owner_id",
  });

  if (error) {
    throw error;
  }

  await adminClient.from("notifications").insert({
    user_id: ownerId,
    type: "system",
    title: "Billing updated",
    message: `Workspace subscription is now ${values.status} on the ${plan} plan.`,
    target_path: "/settings",
  });

  return { updated: true, ownerId };
}

export async function syncStripeCheckoutCustomer(session: Stripe.Checkout.Session) {
  const adminClient = await createSupabaseAdminClient();

  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to sync Stripe checkout customers.");
  }

  const ownerId = session.metadata?.owner_id ?? session.client_reference_id ?? null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (!ownerId || !customerId) {
    return { updated: false, ownerId: null };
  }

  const { error } = await adminClient.from("workspace_billing").upsert(
    {
      owner_id: ownerId,
      stripe_customer_id: customerId,
    },
    {
      onConflict: "owner_id",
    },
  );

  if (error) {
    throw error;
  }

  return { updated: true, ownerId };
}
