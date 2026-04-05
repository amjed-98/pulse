import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  icon: "revenue" | "projects" | "team" | "tasks";
}

function Icon({ icon }: Pick<StatCardProps, "icon">) {
  switch (icon) {
    case "revenue":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7H14.5a3.5 3.5 0 1 1 0 7H6" />
        </svg>
      );
    case "projects":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M3 7h18M6 3h12a2 2 0 0 1 2 2v14H4V5a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "tasks":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="m9 11 3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
  }
}

export function StatCard({ label, value, trend, trendDirection, icon }: StatCardProps) {
  return (
    <div className="surface-card card-noise relative overflow-hidden rounded-[1.75rem] p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/80 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-[clamp(1.75rem,1.55rem+0.8vw,2.4rem)] font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(14,165,233,0.08))] text-[var(--color-accent)] ring-1 ring-indigo-100">
          <Icon icon={icon} />
        </div>
      </div>
      <div className="relative z-10 mt-5 flex items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-1 font-medium",
            trendDirection === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
          )}
        >
          {trend}
        </span>
        <span className="text-slate-500">vs last month</span>
      </div>
    </div>
  );
}
