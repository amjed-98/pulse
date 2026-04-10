"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "pending";

interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-500/30 bg-emerald-600 text-white",
  error: "border-red-500/30 bg-red-600 text-white",
  pending: "border-slate-700/50 bg-slate-950 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();

    setToasts((current) => {
      const duplicate = current.find(
        (entry) => entry.message === toast.message && entry.tone === toast.tone,
      );

      if (duplicate) {
        const existingTimer = timersRef.current.get(duplicate.id);

        if (existingTimer) {
          window.clearTimeout(existingTimer);
          timersRef.current.delete(duplicate.id);
        }

        return [...current.filter((entry) => entry.id !== duplicate.id), { ...toast, id }].slice(-4);
      }

      return [...current, { ...toast, id }].slice(-4);
    });

    const duration = toast.tone === "pending" ? 2000 : 4000;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
      timersRef.current.delete(id);
    }, duration);

    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur",
              toneStyles[toast.tone],
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
