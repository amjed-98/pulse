import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsForms } from "@/components/dashboard/SettingsForms";
import { getCurrentProfile, getWorkspaceBilling, getWorkspaceInvoiceHistory } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Settings",
    description: "Manage profile, password, and account settings in Pulse.",
  };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { billing: billingIntent } = await searchParams;
  const [profile, billing, invoices] = await Promise.all([getCurrentProfile(), getWorkspaceBilling(), getWorkspaceInvoiceHistory()]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Account controls</h1>
        <p className="mt-2 text-sm text-slate-500">Update workspace identity, secure credentials, and manage account lifecycle.</p>
      </section>
      <SettingsForms profile={profile} billing={billing} billingIntent={billingIntent ?? null} invoices={invoices} />
    </div>
  );
}
