import type { ReactNode } from "react";

interface EmptyStateProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
}

export function EmptyState({ eyebrow, title, description, actions, aside }: EmptyStateProps) {
  return (
    <section className="surface-card overflow-hidden rounded-[1.9rem]">
      <div className="grid gap-8 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-5">
          {aside}
        </div>
      </div>
    </section>
  );
}
