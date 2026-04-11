import { BILLING_PLANS } from "@/lib/constants";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BillingGateFeature,
  BillingGatePayload,
  PlanLimitPayload,
  PlanLimitResource,
  WorkspaceBilling,
  WorkspaceInvoiceSummary,
  WorkspaceBillingSummary,
  WorkspacePlan,
  WorkspaceUsage,
} from "@/lib/types";

function buildDefaultBilling(ownerId: string): WorkspaceBilling {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  return {
    id: `virtual-${ownerId}`,
    cancel_at_period_end: false,
    owner_id: ownerId,
    plan: "starter",
    current_period_end: null,
    stripe_customer_id: null,
    stripe_price_id: null,
    stripe_subscription_id: null,
    status: "trialing",
    trial_ends_at: trialEndsAt.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getWorkspaceBillingSummary(ownerId: string): Promise<WorkspaceBillingSummary> {
  const supabase = await createSupabaseServerClient();
  const { data: billing } = await supabase
    .from("workspace_billing")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const { count: projectsUsed } = await supabase.from("projects").select("*", { count: "exact", head: true });
  const { count: membersUsed } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { data: storageRows } = await supabase.from("project_assets").select("file_size");

  const resolvedBilling = billing ?? buildDefaultBilling(ownerId);
  const usage: WorkspaceUsage = {
    projectsUsed: projectsUsed ?? 0,
    membersUsed: membersUsed ?? 0,
    storageBytesUsed: (storageRows ?? []).reduce((sum, asset) => sum + Number(asset.file_size ?? 0), 0),
  };

  return {
    billing: resolvedBilling,
    plan: BILLING_PLANS[resolvedBilling.plan],
    usage,
    stripeConfigured: isStripeConfigured(),
  };
}

export async function getWorkspaceBillingInvoices(ownerId: string): Promise<WorkspaceInvoiceSummary[]> {
  if (!isStripeConfigured()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: billing } = await supabase
    .from("workspace_billing")
    .select("stripe_customer_id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!billing?.stripe_customer_id) {
    return [];
  }

  const stripe = getStripeClient();
  const invoices = await stripe.invoices.list({
    customer: billing.stripe_customer_id,
    limit: 6,
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id ?? `invoice-${invoice.created}`,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    amountPaid: invoice.amount_paid,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
  }));
}

export function getPlanDefinition(plan: WorkspacePlan) {
  return BILLING_PLANS[plan];
}

export function getStorageLimitBytes(plan: WorkspacePlan) {
  return BILLING_PLANS[plan].limits.storageMb * 1024 * 1024;
}

export function getNextWorkspacePlan(plan: WorkspacePlan): WorkspacePlan | null {
  if (plan === "starter") {
    return "growth";
  }

  if (plan === "growth") {
    return "scale";
  }

  return null;
}

export function buildPlanLimitPayload(params: {
  resource: PlanLimitResource;
  currentPlan: WorkspacePlan;
  used: number;
  limit: number;
}): PlanLimitPayload {
  return {
    kind: "plan_limit",
    resource: params.resource,
    currentPlan: params.currentPlan,
    recommendedPlan: getNextWorkspacePlan(params.currentPlan),
    used: params.used,
    limit: params.limit,
  };
}

export function isBillingStateActive(status: WorkspaceBilling["status"]) {
  return status === "active" || status === "trialing";
}

export function buildBillingGatePayload(params: {
  feature: BillingGateFeature;
  status: WorkspaceBilling["status"];
  currentPlan: WorkspacePlan;
}): BillingGatePayload {
  return {
    kind: "billing_gate",
    feature: params.feature,
    status: params.status,
    currentPlan: params.currentPlan,
    reason: "requires_active_subscription",
  };
}

export function getBillingGateMessage(feature: BillingGateFeature, status: WorkspaceBilling["status"]) {
  const base =
    status === "past_due"
      ? "Billing is past due."
      : status === "canceled"
        ? "This workspace subscription is canceled."
        : "This feature requires an active subscription.";

  if (feature === "attachments") {
    return `${base} Restore billing to upload project assets.`;
  }

  return `${base} Restore billing to invite more teammates.`;
}

export function getTrialDaysRemaining(trialEndsAt: string | null) {
  if (!trialEndsAt) {
    return null;
  }

  const diff = new Date(trialEndsAt).getTime() - Date.now();

  if (Number.isNaN(diff)) {
    return null;
  }

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
