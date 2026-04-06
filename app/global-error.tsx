"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Global app error", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 px-4 py-12 text-white antialiased">
        <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Critical error</p>
            <h1 className="mt-3 text-3xl font-semibold">The app could not recover</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              A fatal rendering error interrupted the application shell. Reload the page to retry.
            </p>
            {error.digest ? (
              <p className="mt-4 rounded-2xl bg-black/40 px-4 py-3 font-mono text-xs text-slate-100">
                Digest: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
            >
              Reload app
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
