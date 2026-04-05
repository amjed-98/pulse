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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
      <div className="w-full max-w-md space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
