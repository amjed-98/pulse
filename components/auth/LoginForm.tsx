"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { signIn, signInWithGoogle } from "@/lib/actions/auth";
import type { AuthFormState } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

const initialState: AuthFormState = {};

export function LoginForm({ next, siteUrl }: { next?: string | null; siteUrl: string }) {
  const [state, submitAction, isPending] = useActionState(signIn, initialState);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: state.email ?? "",
      password: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("next", next ?? "/dashboard");
    formData.set("siteUrl", siteUrl);

    startTransition(() => {
      submitAction(formData);
    });
  });

  return (
    <div className="surface-card w-full max-w-md space-y-6 rounded-[1.75rem] p-8 backdrop-blur">
      <div className="space-y-2">
        <p className="section-kicker">Sign in</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">Welcome back</h1>
        <p className="text-sm leading-7 text-slate-500">Sign in to manage analytics, projects, and team activity in Pulse.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <input type="hidden" name="siteUrl" value={siteUrl} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message ?? state.fieldErrors?.email?.[0]}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message ?? state.fieldErrors?.password?.[0]}
          {...register("password")}
        />
        {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
        <Button type="submit" className="w-full" loading={isPending}>
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">or continue with</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <input type="hidden" name="siteUrl" value={siteUrl} />
        <SubmitButton type="submit" variant="secondary" className="w-full">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3z"
            />
            <path
              fill="#34A853"
              d="M2.8 7.4l3.2 2.3c.9-1.8 2.8-3 5-3 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.7 2.7 12 2.7 8.4 2.7 5.2 4.8 3.7 7.9z"
            />
            <path
              fill="#FBBC05"
              d="M12 21.3c2.6 0 4.7-.9 6.2-2.5l-2.9-2.3c-.8.6-1.9 1.1-3.3 1.1-2.5 0-4.6-1.7-5.3-4l-3.3 2.5c1.5 3.1 4.7 5.2 8.6 5.2z"
            />
            <path
              fill="#4285F4"
              d="M21.2 12c0-.5-.1-.9-.1-1.3H12v3.9h5.5c-.3 1.4-1.1 2.5-2.2 3.2l2.9 2.3c1.7-1.6 3-4 3-8.1z"
            />
          </svg>
          Continue with Google
        </SubmitButton>
      </form>

      <p className="border-t border-slate-100 pt-5 text-sm text-slate-500">
        New to Pulse?{" "}
        <Link href="/signup" className="font-medium text-[var(--color-accent)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
