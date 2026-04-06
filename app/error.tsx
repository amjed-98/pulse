"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="max-w-lg rounded-[2rem] border border-white/70 bg-white/95 p-8 shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Application error</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Something went wrong</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Pulse hit an unexpected problem while rendering this screen. Try again, and if the issue keeps happening, use the reference below when debugging.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100">
            Digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.location.assign("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
