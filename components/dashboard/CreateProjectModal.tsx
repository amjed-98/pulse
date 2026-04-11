"use client";

import { useEffect, useRef, useState, startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createProject } from "@/lib/actions/projects";
import type { ActionState, PlanLimitPayload } from "@/lib/types";
import { PlanLimitAlert } from "@/components/dashboard/PlanLimitAlert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters."),
  description: z.string().max(400, "Description must be 400 characters or fewer.").optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  progress: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
});

type Values = z.infer<typeof schema>;

const initialState: ActionState = {};

function getPlanLimitPayload(payload: ActionState["payload"]): PlanLimitPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.kind !== "plan_limit") {
    return null;
  }

  return payload as PlanLimitPayload;
}

export function CreateProjectModal({ triggerLabel = "New project" }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [state, submitAction, isPending] = useActionState(createProject, initialState);
  const { showToast } = useToast();
  const lastToastMessageRef = useRef<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      progress: 0,
      dueDate: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      reset();
    }
  }, [reset, state.success]);

  useEffect(() => {
    if (state.message && state.message !== lastToastMessageRef.current) {
      lastToastMessageRef.current = state.message;
      showToast({
        tone: state.success ? "success" : "error",
        message: state.message,
      });
    }
  }, [showToast, state.message, state.success]);

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("description", values.description ?? "");
    formData.set("status", values.status);
    formData.set("progress", String(values.progress));
    formData.set("dueDate", values.dueDate ?? "");

    startTransition(() => {
      showToast({ tone: "pending", message: "Creating project..." });
      submitAction(formData);
    });
  });

  const planLimitPayload = getPlanLimitPayload(state.payload);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a project"
        description="Launch a new initiative and keep the team aligned from day one."
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          {planLimitPayload ? <PlanLimitAlert payload={planLimitPayload} /> : null}
          <Input label="Project name" placeholder="Northstar Growth" error={errors.name?.message ?? state.fieldErrors?.name?.[0]} {...register("name")} />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="min-h-28 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
              placeholder="Describe the scope and intended outcome."
              {...register("description")}
            />
            {errors.description?.message ?? state.fieldErrors?.description?.[0] ? (
              <span className="text-sm text-red-600">{errors.description?.message ?? state.fieldErrors?.description?.[0]}</span>
            ) : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                {...register("status")}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <Input label="Progress" type="number" min="0" max="100" error={errors.progress?.message ?? state.fieldErrors?.progress?.[0]} {...register("progress")} />
            <Input label="Due date" type="date" error={errors.dueDate?.message ?? state.fieldErrors?.dueDate?.[0]} {...register("dueDate")} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Create project
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
