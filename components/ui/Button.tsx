import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(135deg,#5b52f4_0%,#4338ca_100%)] text-white shadow-[var(--shadow-soft)] hover:brightness-105 focus-visible:outline-[var(--color-accent)]",
  secondary:
    "border border-[var(--color-border)] bg-white/90 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[var(--color-border-strong)] hover:bg-white focus-visible:outline-[var(--color-accent)]",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-[var(--color-accent)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:bg-red-700 focus-visible:outline-red-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden="true" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
