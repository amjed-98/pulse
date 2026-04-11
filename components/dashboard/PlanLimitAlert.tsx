"use client";

import Link from "next/link";

import type { PlanLimitPayload } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const resourceLabel: Record<PlanLimitPayload["resource"], string> = {
  projects: "projects",
  members: "members",
  storage: "storage",
};

export function PlanLimitAlert({ payload }: { payload: PlanLimitPayload }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge tone="warning">Plan limit reached</Badge>
          <div>
            <p className="font-medium text-amber-950">
              Your {payload.currentPlan} plan is at capacity for {resourceLabel[payload.resource]}.
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              You are using {payload.used} of {payload.limit} {resourceLabel[payload.resource]} on this workspace.
              {payload.recommendedPlan ? ` Upgrade to ${payload.recommendedPlan} to keep moving.` : " This workspace is already on the highest available plan."}
            </p>
          </div>
        </div>
        <Link href="/settings" className="shrink-0">
          <Button type="button" variant="secondary" size="sm">
            Open billing
          </Button>
        </Link>
      </div>
    </div>
  );
}
