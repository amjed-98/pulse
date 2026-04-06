"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { inviteMember } from "@/lib/actions/team";
import type { ActionState } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  role: z.enum(["admin", "member", "viewer"]),
});

type Values = z.infer<typeof schema>;

const initialState: ActionState = {};

export function TeamInviteForm({ canInvite }: { canInvite: boolean }) {
  const [state, submitAction, isPending] = useActionState(inviteMember, initialState);
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("role", values.role);

    startTransition(() => {
      submitAction(formData);
    });

    reset();
  });

  useEffect(() => {
    if (state.message) {
      showToast({
        tone: state.success ? "success" : "error",
        message: state.message,
      });
    }
  }, [showToast, state.message, state.success]);

  return (
    <form className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]" onSubmit={onSubmit}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">Invite a member</h2>
        <p className="text-sm text-slate-500">Send a workspace invite with a predefined role and let the acceptance flow assign access cleanly.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Input
          label="Email"
          type="email"
          placeholder="teammate@company.com"
          className="flex-1"
          error={errors.email?.message ?? state.fieldErrors?.email?.[0]}
          disabled={!canInvite}
          {...register("email")}
        />
        <label className="flex w-full flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Role</span>
          <select
            className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canInvite}
            {...register("role")}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          {errors.role?.message ?? state.fieldErrors?.role?.[0] ? (
            <span className="text-sm text-red-600">{errors.role?.message ?? state.fieldErrors?.role?.[0]}</span>
          ) : (
            <span className="text-sm text-slate-500">Role applies when the invite is accepted.</span>
          )}
        </label>
        <Button type="submit" className="whitespace-nowrap lg:mt-7 lg:min-w-36" loading={isPending} disabled={!canInvite}>
          Send invite
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="warning">Admin can invite and remove members</Badge>
        <Badge tone="info">Member can collaborate on live work</Badge>
        <Badge tone="neutral">Viewer has read-only workspace access</Badge>
      </div>
      {!canInvite ? <p className="mt-3 text-sm text-slate-500">Only admins can send workspace invites.</p> : null}
    </form>
  );
}
