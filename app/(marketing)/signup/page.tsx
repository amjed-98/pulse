import { headers } from "next/headers";
import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/SignupForm";
import { resolveRequestOrigin } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign Up",
    description: "Create a Pulse account and confirm your email to activate the workspace.",
  };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  const headersList = await headers();
  const siteUrl = resolveRequestOrigin(headersList);
  const { status, email } = await searchParams;
  const showConfirmation = status === "check-email";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.85fr_0.95fr]">
        <div className="order-2 w-full max-w-md justify-self-center lg:order-1">
          <SignupForm defaultEmail={email} showConfirmation={showConfirmation} siteUrl={siteUrl} />
        </div>
        <section className="order-1 hidden lg:block lg:order-2">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-sky-100 bg-sky-50/90 px-3 py-1 text-sm font-semibold text-sky-700">
              New workspace onboarding
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-[clamp(3rem,4vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">
                Launch your command center with real product and team context.
              </h1>
              <p className="max-w-lg text-lg leading-8 text-slate-600">
                Create an account, confirm your email, and bring analytics, projects, and collaboration into a single
                system that feels built for operators.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface-card rounded-[1.65rem] p-5">
                <p className="section-kicker">Fast setup</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">5 min</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">From account creation to a working workspace shell.</p>
              </div>
              <div className="surface-card rounded-[1.65rem] p-5">
                <p className="section-kicker">Built-in demo depth</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Seeded</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Dashboard remains visually rich even before live data arrives.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
