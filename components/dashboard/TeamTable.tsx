"use client";

import { startTransition, useActionState, useEffect, useState } from "react";

import { removeMember, updateMemberRole } from "@/lib/actions/team";
import type { ActionState, Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

interface TeamTableProps {
  members: Profile[];
  currentUserId: string | null;
  currentUserRole: Profile["role"];
}

const roleTone: Record<Profile["role"], "warning" | "info" | "neutral"> = {
  admin: "warning",
  member: "info",
  viewer: "neutral",
};

const initialState: ActionState = {};

function TeamMemberRow({
  member,
  currentUserId,
  currentUserRole,
}: {
  member: Profile;
  currentUserId: string | null;
  currentUserRole: Profile["role"];
}) {
  const canManage = currentUserRole === "admin" && currentUserId !== member.id;
  const [roleState, roleAction, rolePending] = useActionState(updateMemberRole.bind(null, member.id), initialState);
  const [removeState, removeAction, removePending] = useActionState(removeMember.bind(null, member.id), initialState);
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Profile["role"]>(member.role);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    setSelectedRole(member.role);
  }, [member.role]);

  useEffect(() => {
    if (removeState.success) {
      setConfirmingRemoval(false);
      setConfirmation("");
    }
  }, [removeState.success]);

  useEffect(() => {
    if (roleState.message && !roleState.fieldErrors?.role?.[0]) {
      showToast({
        tone: roleState.success ? "success" : "error",
        message: roleState.message,
      });
    }
  }, [roleState.fieldErrors, roleState.message, roleState.success, showToast]);

  useEffect(() => {
    if (removeState.message && !removeState.fieldErrors?.confirmation?.[0]) {
      showToast({
        tone: removeState.success ? "success" : "error",
        message: removeState.message,
      });
    }
  }, [removeState.fieldErrors, removeState.message, removeState.success, showToast]);

  const roleError = roleState.fieldErrors?.role?.[0];
  const removeError = removeState.fieldErrors?.confirmation?.[0];

  return (
    <tr key={member.id}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar src={member.avatar_url} name={member.full_name} />
          <div>
            <p className="font-medium text-slate-900">{member.full_name ?? "Unnamed user"}</p>
            <p className="text-sm text-slate-500">{member.email ?? "No email available"}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        {canManage ? (
          <form
            action={(formData) => {
              startTransition(() => {
                roleAction(formData);
              });
            }}
            className="space-y-2"
          >
            <select
              name="role"
              value={selectedRole}
              onChange={(event) => {
                const nextRole = event.target.value as Profile["role"];
                setSelectedRole(nextRole);
                const formData = new FormData();
                formData.set("role", nextRole);
                startTransition(() => {
                  roleAction(formData);
                });
              }}
              className="h-10 min-w-32 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
              disabled={rolePending}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            {roleError ? <p className="text-sm text-red-600">{roleError}</p> : null}
          </form>
        ) : (
          <Badge tone={roleTone[member.role]}>{member.role}</Badge>
        )}
      </td>
      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(member.created_at)}</td>
      <td className="px-5 py-4 text-right">
        {canManage ? (
          <div className="flex justify-end">
            {!confirmingRemoval ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingRemoval(true)}>
                Remove
              </Button>
            ) : (
              <form
                action={(formData) => {
                  startTransition(() => {
                    removeAction(formData);
                  });
                }}
                className="w-full max-w-64 space-y-2 rounded-2xl border border-red-100 bg-red-50/70 p-3 text-left"
              >
                <p className="text-sm font-medium text-red-700">Type REMOVE to confirm</p>
                <Input
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="REMOVE"
                  error={removeError}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setConfirmingRemoval(false);
                      setConfirmation("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="danger" size="sm" loading={removePending}>
                    Confirm
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : currentUserId === member.id ? (
          <span className="text-sm text-slate-400">Use settings</span>
        ) : (
          <span className="text-sm text-slate-400">Restricted</span>
        )}
      </td>
    </tr>
  );
}

export function TeamTable({ members, currentUserId, currentUserRole }: TeamTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[var(--shadow-card)]">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.22em] text-slate-400">
            <th className="px-5 py-4">Member</th>
            <th className="px-5 py-4">Role</th>
            <th className="px-5 py-4">Joined</th>
            <th className="px-5 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
