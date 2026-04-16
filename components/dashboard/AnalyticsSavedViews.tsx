"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";

import { deleteAnalyticsView, saveAnalyticsView } from "@/lib/actions/analytics";
import type { ActionState, AnalyticsSavedView } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

const initialState: ActionState = {};

export function AnalyticsSavedViews({
  views,
  currentRange,
  currentCategory,
  activeViewId,
}: {
  views: AnalyticsSavedView[];
  currentRange: 7 | 30 | 90;
  currentCategory: "all" | "conversions" | "projects" | "team" | "billing";
  activeViewId: string | null;
}) {
  const [saveState, saveAction, isSaving] = useActionState(saveAnalyticsView, initialState);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();
  const lastToastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (saveState.success) {
      setShowForm(false);
      setName("");
    }
  }, [saveState.success]);

  useEffect(() => {
    if (saveState.message && saveState.message !== lastToastMessageRef.current) {
      lastToastMessageRef.current = saveState.message;
      showToast({
        tone: saveState.success ? "success" : "error",
        message: saveState.message,
      });
    }
  }, [saveState.message, saveState.success, showToast]);

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Saved reports</h2>
          <p className="text-sm text-slate-500">Store reusable analytics views and revisit them with stable URLs.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setShowForm((current) => !current)}>
          {showForm ? "Close" : "Save current view"}
        </Button>
      </div>

      {showForm ? (
        <form
          action={(formData) => {
            startTransition(() => {
              showToast({ tone: "pending", message: "Saving report..." });
              saveAction(formData);
            });
          }}
          className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              label="Report name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekly executive review"
              error={saveState.fieldErrors?.name?.[0]}
            />
            <div className="flex items-end">
              <Button type="submit" loading={isSaving}>
                Save report
              </Button>
            </div>
          </div>
          <input type="hidden" name="range" value={String(currentRange)} />
          <input type="hidden" name="category" value={currentCategory} />
          <p className="mt-3 text-sm text-slate-500">
            Saves the current filter set: {currentRange} days, {currentCategory}.
          </p>
        </form>
      ) : null}

      {views.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {views.map((view) => {
            const href = `/analytics?view=${view.id}&range=${view.range}&category=${view.category}`;
            const isActive = activeViewId === view.id;

            return (
              <article
                key={view.id}
                className={`rounded-[1.5rem] border p-4 ${
                  isActive ? "border-indigo-200 bg-indigo-50/70" : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{view.name}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {view.range}d • {view.category}
                    </p>
                  </div>
                  {isActive ? <Badge tone="info">Active</Badge> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={href}>
                    <Button type="button" size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={isDeleting && activeDeleteId === view.id}
                    onClick={() => {
                      if (!window.confirm(`Delete saved report "${view.name}"?`)) {
                        return;
                      }

                      startDeleteTransition(async () => {
                        setActiveDeleteId(view.id);
                        showToast({ tone: "pending", message: `Removing ${view.name}...` });
                        const result = await deleteAnalyticsView(view.id);
                        setActiveDeleteId(null);
                        if (result.message) {
                          showToast({
                            tone: result.success ? "success" : "error",
                            message: result.message,
                          });
                        }
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-500">
          No saved reports yet. Save a filtered analytics view to reuse it later or share it with clients.
        </div>
      )}
    </section>
  );
}
