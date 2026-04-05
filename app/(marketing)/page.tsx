import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MARKETING_FEATURES, PRICING_TIERS } from "@/lib/constants";
import { getCurrentUser } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Pulse",
    description: "Pulse is an analytics and team management dashboard for fast-moving product teams.",
  };
}

export default async function MarketingPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="glass-panel flex items-center justify-between rounded-[2rem] border border-white/70 px-6 py-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] text-white shadow-[0_18px_30px_-20px_rgba(15,23,42,0.65)]">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 14c3.2 0 3.2-4 6.4-4 3.2 0 3.2 8 6.4 8 1.6 0 2.4-1 3.2-2" />
                <path d="M4 8c3.2 0 3.2-4 6.4-4 3.2 0 3.2 8 6.4 8 1.6 0 2.4-1 3.2-2" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">Pulse</p>
              <p className="text-sm text-slate-500">Analytics OS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70">
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium !text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-accent-strong)]"
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="surface-card relative grid items-center gap-10 overflow-hidden rounded-[2rem] px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-y-0 right-[-12%] w-[42%] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.14)_0%,transparent_72%)] blur-3xl" />
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1 text-sm font-semibold text-[var(--color-accent)]">
              Analytics and team operations, in one system
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-[clamp(3.25rem,6vw,5.5rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-slate-950">
                Run projects, revenue, and team performance from a single command center.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Pulse gives product teams a live operating view across growth metrics, project delivery, and execution
                health without stitching together five separate tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 text-base font-medium text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-accent-strong)]"
              >
                Create workspace
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-5 text-base font-medium text-slate-900 transition hover:border-[var(--color-border-strong)] hover:bg-slate-50"
              >
                View dashboard
              </Link>
            </div>
            <div className="grid gap-4 text-sm text-slate-500 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">48K+</p>
                <p>Monthly revenue tracked</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">12</p>
                <p>Active projects monitored</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">94%</p>
                <p>Delivery completion rate</p>
              </div>
            </div>
          </div>

          <div className="grid-surface relative rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 shadow-[0_50px_90px_-60px_rgba(15,23,42,0.8)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_36%)]" />
            <div className="relative rounded-[1.5rem] border border-white/10 bg-slate-900/95 p-5 text-white shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Pulse overview</p>
                  <h2 className="text-2xl font-semibold">Northstar Growth</h2>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">+12.4%</span>
              </div>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Revenue</p>
                  <p className="mt-2 text-2xl font-semibold">$48.2K</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Projects</p>
                  <p className="mt-2 text-2xl font-semibold">12</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Team</p>
                  <p className="mt-2 text-2xl font-semibold">8</p>
                </div>
              </div>
              <div className="space-y-3 rounded-[1.4rem] border border-white/8 bg-white/5 p-4">
                <div className="flex items-end gap-3">
                  {[28, 42, 36, 60, 54, 76].map((height) => (
                    <div key={height} className="flex flex-1 items-end gap-1">
                      <div
                        className="w-full rounded-t-full bg-gradient-to-t from-indigo-500 to-sky-400"
                        style={{ height: `${height * 1.6}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs uppercase tracking-[0.25em] text-slate-500">
                  <span>Nov</span>
                  <span>Dec</span>
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {MARKETING_FEATURES.map((feature) => (
            <article key={feature.title} className="surface-card rounded-[1.75rem] p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(14,165,233,0.08))] text-[var(--color-accent)] ring-1 ring-indigo-100">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3 4 7v10l8 4 8-4V7Z" />
                  <path d="m4 7 8 4 8-4M12 11v10" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-950">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="surface-card rounded-[2rem] p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Pricing</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Simple plans for modern teams</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-500">
              This portfolio build includes a real auth flow, protected routes, server actions, and Supabase-backed
              data modeling, so the experience maps to how a production SaaS app is built.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {PRICING_TIERS.map((tier) => (
              <article key={tier.name} className="rounded-[1.75rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-950">{tier.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">{tier.description}</p>
                  </div>
                  <p className="text-3xl font-semibold text-slate-950">
                    {tier.price}
                    <span className="text-base font-normal text-slate-500">/mo</span>
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
