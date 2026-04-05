import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="flex w-full flex-col gap-2" htmlFor={inputId}>
        {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100",
            error && "border-red-300 focus:border-red-500 focus:ring-red-100",
            className,
          )}
          {...props}
        />
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
        {!error && hint ? <span className="text-sm text-slate-500">{hint}</span> : null}
      </label>
    );
  },
);

Input.displayName = "Input";
