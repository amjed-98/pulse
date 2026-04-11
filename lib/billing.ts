import { BILLING_PLANS } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceBilling, WorkspaceBillingSummary, WorkspacePlan, WorkspaceUsage } from "@/lib/types";

function buildDefaultBilling(ownerId: string): WorkspaceBilling {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  return {
    id: `virtual-${ownerId}`,
    owner_id: ownerId,
    plan: "starter",
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
    .order("created_at", { ascending: true })
    .limit(1)
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
  };
}

export function getPlanDefinition(plan: WorkspacePlan) {
  return BILLING_PLANS[plan];
}

export function getStorageLimitBytes(plan: WorkspacePlan) {
  return BILLING_PLANS[plan].limits.storageMb * 1024 * 1024;
}
