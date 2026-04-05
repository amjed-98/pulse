import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          The page you requested does not exist or you do not have access to it.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-[var(--color-border-strong)] hover:bg-slate-50"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-accent-strong)]"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
