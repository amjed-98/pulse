import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/SignupForm";

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
  const { status, email } = await searchParams;
  const showConfirmation = status === "check-email";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
      <SignupForm defaultEmail={email} showConfirmation={showConfirmation} />
    </main>
  );
}
