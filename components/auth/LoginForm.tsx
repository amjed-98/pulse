"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { signIn } from "@/lib/actions/auth";
import type { AuthFormState } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

const initialState: AuthFormState = {};

export function LoginForm() {
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

      <p className="border-t border-slate-100 pt-5 text-sm text-slate-500">
        New to Pulse?{" "}
        <Link href="/signup" className="font-medium text-[var(--color-accent)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
