"use client";

import Link from "next/link";

import type { BillingGatePayload } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function getFeatureLabel(feature: BillingGatePayload["feature"]) {
  if (feature === "attachments") {
    return "project asset uploads";
  }

  return "team invites";
}

export function BillingGateAlert({ payload }: { payload: BillingGatePayload }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge tone="danger">Subscription required</Badge>
          <div>
            <p className="font-medium text-red-950">Billing status is {payload.status}.</p>
            <p className="mt-1 text-sm leading-6 text-red-800">
              Pulse is blocking {getFeatureLabel(payload.feature)} until the workspace subscription returns to an active state.
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
