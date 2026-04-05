import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "info" | "neutral" | "danger";

const toneStyles: Record<BadgeTone, string> = {
  success: "bg-emerald-50/90 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50/90 text-amber-700 ring-amber-200",
  info: "bg-sky-50/90 text-sky-700 ring-sky-200",
  neutral: "bg-slate-100/90 text-slate-700 ring-slate-200",
  danger: "bg-red-50/90 text-red-700 ring-red-200",
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-[0.02em] ring-1 ring-inset",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
