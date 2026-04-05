"use client";

import { startTransition, useActionState, useEffect, useOptimistic, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { changePassword, deleteAccount, updateProfile } from "@/lib/actions/auth";
import type { ActionState, Profile } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  avatarUrl: z.string().url("Enter a valid URL.").or(z.literal("")),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

const initialState: ActionState = {};

interface ToastState {
  tone: "success" | "error" | "pending";
  message: string;
}

export function SettingsForms({ profile }: { profile: Profile }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccount, initialState);
  const [toast, pushToast] = useOptimistic<ToastState | null, ToastState | null>(null, (_, value) => value);
  const [resolvedToast, setResolvedToast] = useState<ToastState | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name ?? "",
      avatarUrl: profile.avatar_url ?? "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const nextState = [profileState, passwordState, deleteState].find((state) => state.message);

    if (nextState?.message) {
      setResolvedToast({
        tone: nextState.success ? "success" : "error",
        message: nextState.message,
      });
    }
  }, [deleteState, passwordState, profileState]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-950">Profile</h2>
          <p className="text-sm text-slate-500">Update the identity details shown across the workspace.</p>
        </div>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleProfileSubmit((values) => {
            const formData = new FormData();
            formData.set("fullName", values.fullName);
            formData.set("avatarUrl", values.avatarUrl);
            startTransition(() => {
              pushToast({ tone: "pending", message: "Saving profile..." });
              profileAction(formData);
            });
          })}
        >
          <Input label="Full name" error={profileErrors.fullName?.message ?? profileState.fieldErrors?.fullName?.[0]} {...registerProfile("fullName")} />
          <Input label="Avatar URL" error={profileErrors.avatarUrl?.message ?? profileState.fieldErrors?.avatarUrl?.[0]} {...registerProfile("avatarUrl")} />
          <div className="md:col-span-2">
            <Button type="submit" loading={profilePending}>
              Save profile
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-950">Password</h2>
          <p className="text-sm text-slate-500">Rotate your credentials and keep account access secure.</p>
        </div>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handlePasswordSubmit((values) => {
            const formData = new FormData();
            formData.set("password", values.password);
            formData.set("confirmPassword", values.confirmPassword);
            startTransition(() => {
              pushToast({ tone: "pending", message: "Updating password..." });
              passwordAction(formData);
            });
            resetPassword();
          })}
        >
          <Input
            label="New password"
            type="password"
            error={passwordErrors.password?.message ?? passwordState.fieldErrors?.password?.[0]}
            {...registerPassword("password")}
          />
          <Input
            label="Confirm password"
            type="password"
            error={passwordErrors.confirmPassword?.message ?? passwordState.fieldErrors?.confirmPassword?.[0]}
            {...registerPassword("confirmPassword")}
          />
          <div className="md:col-span-2">
            <Button type="submit" loading={passwordPending}>
              Update password
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-red-100 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-950">Danger zone</h2>
          <p className="text-sm text-slate-500">Delete your account permanently. This action cannot be undone.</p>
        </div>
        <form
          action={() => {
            startTransition(() => {
              pushToast({ tone: "pending", message: "Deleting account..." });
              deleteAction();
            });
          }}
        >
          <Button
            type="submit"
            variant="danger"
            loading={deletePending}
            onClick={(event) => {
              if (!window.confirm("Delete your account permanently?")) {
                event.preventDefault();
              }
            }}
          >
            Delete account
          </Button>
        </form>
      </section>

      {(toast ?? resolvedToast) ? (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl ${
            (toast ?? resolvedToast)?.tone === "success"
              ? "bg-emerald-600 text-white"
              : (toast ?? resolvedToast)?.tone === "error"
                ? "bg-red-600 text-white"
                : "bg-slate-900 text-white"
          }`}
        >
          {(toast ?? resolvedToast)?.message}
        </div>
      ) : null}
    </div>
  );
}
