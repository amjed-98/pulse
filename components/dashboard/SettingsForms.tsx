"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { changePassword, deleteAccount, updateProfile } from "@/lib/actions/auth";
import type { ActionState, Profile } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
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

export function SettingsForms({ profile }: { profile: Profile }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccount, initialState);
  const { showToast } = useToast();
  const lastToastMessageRef = useRef<string | null>(null);
  const [persistedAvatarUrl, setPersistedAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(profile.avatar_url);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name ?? "",
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
    setPersistedAvatarUrl(profile.avatar_url);
  }, [profile.avatar_url]);

  useEffect(() => {
    if (avatarFile) {
      const objectUrl = URL.createObjectURL(avatarFile);
      setAvatarPreviewUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    setAvatarPreviewUrl(removeAvatar ? null : persistedAvatarUrl);
  }, [avatarFile, persistedAvatarUrl, removeAvatar]);

  useEffect(() => {
    if (profileState.success) {
      const nextAvatarUrl =
        profileState.payload &&
        typeof profileState.payload === "object" &&
        !Array.isArray(profileState.payload) &&
        "avatarUrl" in profileState.payload &&
        typeof profileState.payload.avatarUrl === "string"
          ? profileState.payload.avatarUrl
          : null;

      setAvatarFile(null);
      setRemoveAvatar(false);
      setPersistedAvatarUrl(nextAvatarUrl);
      setAvatarPreviewUrl(nextAvatarUrl);
    }
  }, [profileState.payload, profileState.success]);

  useEffect(() => {
    if (passwordState.success) {
      resetPassword();
    }
  }, [passwordState.success, resetPassword]);

  useEffect(() => {
    const nextState = [profileState, passwordState, deleteState].find((state) => state.message);

    if (nextState?.message && nextState.message !== lastToastMessageRef.current) {
      lastToastMessageRef.current = nextState.message;
      showToast({
        tone: nextState.success ? "success" : "error",
        message: nextState.message,
      });
    }
  }, [deleteState, passwordState, profileState, showToast]);

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
            formData.set("removeAvatar", removeAvatar ? "true" : "false");

            if (avatarFile) {
              formData.set("avatarFile", avatarFile);
            }

            startTransition(() => {
              showToast({
                tone: "pending",
                message: avatarFile ? "Uploading avatar..." : "Saving profile...",
              });
              profileAction(formData);
            });
          })}
        >
          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 md:col-span-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex items-center gap-4">
                <Avatar src={avatarPreviewUrl} name={profile.full_name} className="size-16 text-lg" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Profile photo</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                    Upload a square image for the sidebar, topbar, and team views. PNG, JPG, WEBP, or GIF up to 5 MB.
                  </p>
                </div>
              </div>
              <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Upload avatar</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="block h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setAvatarFile(nextFile);

                      if (nextFile) {
                        setRemoveAvatar(false);
                      }
                    }}
                  />
                  {profileState.fieldErrors?.avatarFile?.[0] ? (
                    <span className="text-sm text-red-600">{profileState.fieldErrors.avatarFile[0]}</span>
                  ) : (
                    <span className="text-sm text-slate-500">
                      {avatarFile ? `Ready to upload ${avatarFile.name}` : "No new file selected."}
                    </span>
                  )}
                </label>
                <label className="mt-7 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={removeAvatar}
                    onChange={(event) => {
                      setRemoveAvatar(event.target.checked);

                      if (event.target.checked) {
                        setAvatarFile(null);
                      }
                    }}
                  />
                  Remove current avatar
                </label>
              </div>
            </div>
          </div>
          <Input
            label="Full name"
            error={profileErrors.fullName?.message ?? profileState.fieldErrors?.fullName?.[0]}
            {...registerProfile("fullName")}
          />
          <div className="hidden md:block" />
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
              showToast({ tone: "pending", message: "Updating password..." });
              passwordAction(formData);
            });
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
              showToast({ tone: "pending", message: "Deleting account..." });
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

    </div>
  );
}
