"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { inviteMember } from "@/lib/actions/team";
import type { ActionState } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type Values = z.infer<typeof schema>;

const initialState: ActionState = {};

export function TeamInviteForm() {
  const [state, submitAction, isPending] = useActionState(inviteMember, initialState);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);

    startTransition(() => {
      submitAction(formData);
    });

    reset();
  });

  return (
    <form className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]" onSubmit={onSubmit}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">Invite a member</h2>
        <p className="text-sm text-slate-500">Send a Supabase invite email to add someone to the workspace.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          label="Email"
          type="email"
          placeholder="teammate@company.com"
          className="flex-1"
          error={errors.email?.message ?? state.fieldErrors?.email?.[0]}
          {...register("email")}
        />
        <Button type="submit" className="whitespace-nowrap sm:mt-7 sm:min-w-36" loading={isPending}>
          Send invite
        </Button>
      </div>
      {state.message ? <p className={state.success ? "mt-3 text-sm text-emerald-600" : "mt-3 text-sm text-red-600"}>{state.message}</p> : null}
    </form>
  );
}
