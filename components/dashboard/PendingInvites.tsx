"use client";

import { useTransition } from "react";

import { revokeInvite } from "@/lib/actions/team";
import type { WorkspaceInvite } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

const roleTone: Record<WorkspaceInvite["role"], "warning" | "info" | "neutral"> = {
  admin: "warning",
  member: "info",
  viewer: "neutral",
};

export function PendingInvites({
  invites,
  canManage,
}: {
  invites: WorkspaceInvite[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  if (invites.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-950">Pending invites</h2>
          <p className="text-sm text-slate-500">No outstanding invitations are waiting for acceptance.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">Pending invites</h2>
        <p className="text-sm text-slate-500">Outstanding workspace invitations and their assigned roles.</p>
      </div>
      <div className="space-y-3">
        {invites.map((invite) => (
          <article key={invite.id} className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-100 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-950">{invite.email}</p>
                <Badge tone={roleTone[invite.role]}>{invite.role}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">Invited {formatDate(invite.invited_at)}</p>
            </div>
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={isPending}
                onClick={() => {
                  if (!window.confirm(`Revoke the invite for ${invite.email}?`)) {
                    return;
                  }

                  startTransition(async () => {
                    const result = await revokeInvite(invite.id);
                    if (result.message) {
                      showToast({
                        tone: result.success ? "success" : "error",
                        message: result.message,
                      });
                    }
                  });
                }}
              >
                Revoke
              </Button>
            ) : (
              <span className="text-sm text-slate-400">Admin only</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
