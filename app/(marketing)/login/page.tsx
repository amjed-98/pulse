import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Login",
    description: "Sign in to your Pulse workspace.",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_0.85fr]">
        <section className="hidden lg:block">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1 text-sm font-semibold text-[var(--color-accent)]">
              Secure workspace access
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-[clamp(3rem,4vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">
                Step back into the operating system behind your team.
              </h1>
              <p className="max-w-lg text-lg leading-8 text-slate-600">
                Monitor delivery, spot growth signals, and keep project visibility crisp without losing time to
                fragmented tools.
              </p>
            </div>

          </div>
        </section>

        <div className="w-full max-w-md justify-self-center space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
