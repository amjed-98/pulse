"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { changePassword, deleteAccount, updateProfile } from "@/lib/actions/auth";
import { openStripeBillingPortal, startStripeCheckout, updateWorkspacePlan } from "@/lib/actions/billing";
import { BILLING_PLANS } from "@/lib/constants";
import type { ActionState, Profile, WorkspaceBillingSummary, WorkspaceInvoiceSummary } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
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

function getUsagePercentage(used: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
}

function getBillingStatusCopy(billing: WorkspaceBillingSummary) {
  if (billing.billing.status === "past_due") {
    return {
      tone: "warning" as const,
      title: "Billing needs attention",
      message: "This workspace is marked past due. Use the billing portal to recover payment and avoid disruption.",
    };
  }

  if (billing.billing.status === "trialing") {
    const trialEndsAt = billing.billing.trial_ends_at ? new Date(billing.billing.trial_ends_at) : null;
    const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : null;

    return {
      tone: "info" as const,
      title: "Trial workspace",
      message:
        daysRemaining === null
          ? "This workspace is currently in trial mode."
          : `Trial access ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
    };
  }

  return {
    tone: "success" as const,
    title: "Billing is healthy",
    message: "This workspace is on an active plan and can continue operating within its current limits.",
  };
}

function getBillingIntentCopy(intent: string | null) {
  switch (intent) {
    case "success":
      return {
        tone: "success" as const,
        title: "Checkout completed",
        message: "Stripe accepted the checkout. Pulse is syncing the subscription state now.",
      };
    case "canceled":
      return {
        tone: "warning" as const,
        title: "Checkout canceled",
        message: "No billing changes were made. You can restart checkout whenever you are ready.",
      };
    case "portal-return":
      return {
        tone: "info" as const,
        title: "Returned from billing portal",
        message: "Subscription changes from Stripe will appear here as soon as the webhook sync completes.",
      };
    case "stripe-unavailable":
    case "portal-unavailable":
      return {
        tone: "warning" as const,
        title: "Stripe is not ready",
        message: "Add the Stripe environment variables to enable hosted checkout and the billing portal.",
      };
    case "error":
      return {
        tone: "danger" as const,
        title: "Billing action failed",
        message: "Pulse could not start the billing flow. Check server logs and Stripe configuration.",
      };
    default:
      return null;
  }
}

export function SettingsForms({
  profile,
  billing,
  billingIntent,
  invoices,
}: {
  profile: Profile;
  billing: WorkspaceBillingSummary | null;
  billingIntent: string | null;
  invoices: WorkspaceInvoiceSummary[];
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccount, initialState);
  const [billingState, billingAction, billingPending] = useActionState(updateWorkspacePlan, initialState);
  const { showToast } = useToast();
  const lastToastMessageRef = useRef<string | null>(null);
  const [persistedAvatarUrl, setPersistedAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(profile.avatar_url);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const billingStatus = billing ? getBillingStatusCopy(billing) : null;
  const billingIntentCopy = getBillingIntentCopy(billingIntent);

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
    const nextState = [profileState, passwordState, deleteState, billingState].find((state) => state.message);

    if (nextState?.message && nextState.message !== lastToastMessageRef.current) {
      lastToastMessageRef.current = nextState.message;
      showToast({
        tone: nextState.success ? "success" : "error",
        message: nextState.message,
      });
    }
  }, [billingState, deleteState, passwordState, profileState, showToast]);

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
          <h2 className="text-lg font-semibold text-slate-950">Billing</h2>
          <p className="text-sm text-slate-500">Model SaaS plan limits and workspace capacity like a real production account.</p>
        </div>
        {billing ? (
          <div className="space-y-5">
            {billingIntentCopy ? (
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={billingIntentCopy.tone}>{billingIntentCopy.title}</Badge>
                  <p className="text-sm text-slate-600">{billingIntentCopy.message}</p>
                </div>
              </div>
            ) : null}
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {billingStatus ? <Badge tone={billingStatus.tone}>{billingStatus.title}</Badge> : null}
                {billingStatus ? <p className="text-sm text-slate-600">{billingStatus.message}</p> : null}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">Current plan</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    {billing.plan.name} <span className="text-base font-medium text-slate-500">{billing.plan.priceLabel}</span>
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{billing.plan.description}</p>
                </div>
                <Badge tone={billing.billing.status === "active" ? "success" : billing.billing.status === "trialing" ? "info" : "warning"}>
                  {billing.billing.status}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>Stripe {billing.stripeConfigured ? "configured" : "not configured"}</span>
                <span>•</span>
                <span>{billing.billing.stripe_subscription_id ? "Subscription connected" : "No live subscription yet"}</span>
                {billing.billing.current_period_end ? (
                  <>
                    <span>•</span>
                    <span>Renews {new Date(billing.billing.current_period_end).toLocaleDateString()}</span>
                  </>
                ) : null}
                {billing.billing.cancel_at_period_end ? (
                  <>
                    <span>•</span>
                    <span>Cancels at period end</span>
                  </>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Projects",
                    used: billing.usage.projectsUsed,
                    limit: billing.plan.limits.projects,
                  },
                  {
                    label: "Members",
                    used: billing.usage.membersUsed,
                    limit: billing.plan.limits.members,
                  },
                  {
                    label: "Storage",
                    used: Math.round(billing.usage.storageBytesUsed / (1024 * 1024)),
                    limit: billing.plan.limits.storageMb,
                  },
                ].map((item) => {
                  const percentage = getUsagePercentage(item.used, item.limit);

                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>{item.label}</span>
                        <span>
                          {item.used} / {item.limit}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={
                            percentage >= 90
                              ? "h-full rounded-full bg-red-500"
                              : percentage >= 75
                                ? "h-full rounded-full bg-amber-500"
                                : "h-full rounded-full bg-[var(--color-accent)]"
                          }
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{percentage}% of current plan capacity</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {profile.role === "admin" ? (
              <>
                {billing.stripeConfigured && billing.billing.stripe_customer_id ? (
                  <form action={openStripeBillingPortal} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Manage subscription in Stripe</p>
                        <p className="mt-1 text-sm text-slate-500">Use the billing portal for payment methods, cancellations, and invoice history.</p>
                      </div>
                      <SubmitButton type="submit" variant="secondary">
                        Open billing portal
                      </SubmitButton>
                    </div>
                  </form>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-3">
                  {Object.values(BILLING_PLANS).map((plan) => {
                    const isCurrentPlan = billing.billing.plan === plan.id;
                    const isPaidPlan = plan.id !== "starter";

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-[1.5rem] border p-5 ${
                          isCurrentPlan ? "border-indigo-200 bg-indigo-50/70" : "border-slate-100 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500">{plan.priceLabel}</p>
                          </div>
                          {isCurrentPlan ? <Badge tone="info">Current</Badge> : null}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-500">{plan.description}</p>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p>{plan.limits.projects} projects</p>
                          <p>{plan.limits.members} members</p>
                          <p>{plan.limits.storageMb} MB storage</p>
                        </div>
                        <div className="mt-5">
                          {billing.stripeConfigured ? (
                            isPaidPlan ? (
                              isCurrentPlan && billing.billing.stripe_subscription_id ? (
                                <form action={openStripeBillingPortal}>
                                  <SubmitButton type="submit" variant="secondary">
                                    Manage in Stripe
                                  </SubmitButton>
                                </form>
                              ) : (
                                <form action={startStripeCheckout.bind(null, plan.id as "growth" | "scale")}>
                                  <SubmitButton type="submit" variant="primary">
                                    Upgrade with Stripe
                                  </SubmitButton>
                                </form>
                              )
                            ) : isCurrentPlan ? (
                              <Button type="button" variant="secondary" disabled>
                                Current plan
                              </Button>
                            ) : (
                              <form action={openStripeBillingPortal}>
                                <SubmitButton type="submit" variant="secondary">
                                  Manage downgrade
                                </SubmitButton>
                              </form>
                            )
                          ) : (
                            <form
                              action={(formData) => {
                                startTransition(() => {
                                  showToast({ tone: "pending", message: `Switching to ${plan.name}...` });
                                  billingAction(formData);
                                });
                              }}
                            >
                              <input type="hidden" name="plan" value={plan.id} />
                              <Button type="submit" variant={isCurrentPlan ? "secondary" : "primary"} loading={billingPending}>
                                {isCurrentPlan ? "Current plan" : `Switch to ${plan.name}`}
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!billing.stripeConfigured ? (
                  <p className="text-sm text-slate-500">
                    Stripe is not configured in this environment, so plan changes use local preview billing state instead of hosted checkout.
                  </p>
                ) : null}

                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Billing history</h3>
                      <p className="mt-1 text-sm text-slate-500">Recent invoices and payment activity for this workspace subscription.</p>
                    </div>
                    <Badge tone="neutral">{invoices.length}</Badge>
                  </div>

                  {billing.stripeConfigured ? (
                    invoices.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {invoices.map((invoice) => (
                          <div key={invoice.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-slate-900">{invoice.number ?? invoice.id}</p>
                                  <Badge
                                    tone={
                                      invoice.status === "paid"
                                        ? "success"
                                        : invoice.status === "open"
                                          ? "warning"
                                          : invoice.status === "draft"
                                            ? "info"
                                            : "neutral"
                                    }
                                  >
                                    {invoice.status ?? "unknown"}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                  {formatDate(invoice.createdAt)} • {formatMoney(invoice.amountPaid / 100, invoice.currency)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {invoice.hostedInvoiceUrl ? (
                                  <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                                    <Button type="button" variant="secondary" size="sm">
                                      View invoice
                                    </Button>
                                  </a>
                                ) : null}
                                {invoice.invoicePdfUrl ? (
                                  <a href={invoice.invoicePdfUrl} target="_blank" rel="noreferrer">
                                    <Button type="button" variant="ghost" size="sm">
                                      PDF
                                    </Button>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-5 text-sm leading-7 text-slate-500">
                        No invoices yet. They will appear here after the first successful Stripe billing cycle.
                      </div>
                    )
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-5 text-sm leading-7 text-slate-500">
                      Stripe is not configured in this environment, so invoice history is unavailable.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Only admins can change the workspace plan.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Billing details are not available right now.</p>
        )}
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
