"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  createScheduledAnalyticsReport,
  deleteScheduledAnalyticsReport,
  runScheduledAnalyticsReportNow,
  toggleScheduledAnalyticsReport,
} from "@/lib/actions/analytics";
import type { ActionState, ScheduledReportRunWithMeta, ScheduledReportWithMeta } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

const initialState: ActionState = {};

export function ScheduledReports({
  schedules,
  runs,
  currentRange,
  currentCategory,
}: {
  schedules: ScheduledReportWithMeta[];
  runs: ScheduledReportRunWithMeta[];
  currentRange: 7 | 30 | 90;
  currentCategory: "all" | "conversions" | "projects" | "team" | "billing";
}) {
  const [state, action, isPending] = useActionState(createScheduledAnalyticsReport, initialState);
  const [showForm, setShowForm] = useState(false);
  const [isMutating, startMutation] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { showToast } = useToast();
  const lastToastMessageRef = useRef<string | null>(null);
  const [name, setName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [format, setFormat] = useState<"csv" | "pdf">("pdf");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    if (state.success) {
      setShowForm(false);
      setName("");
      setRecipientEmail("");
      setFormat("pdf");
      setCadence("weekly");
    }
  }, [state.success]);

  useEffect(() => {
    if (state.message && state.message !== lastToastMessageRef.current) {
      lastToastMessageRef.current = state.message;
      showToast({
        tone: state.success ? "success" : "error",
        message: state.message,
      });
    }
  }, [showToast, state.message, state.success]);

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Scheduled delivery</h2>
          <p className="text-sm text-slate-500">
            Save recurring analytics packages for stakeholders. Delivery workers can pick these rules up later without changing the reporting model.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setShowForm((current) => !current)}>
          {showForm ? "Close" : "Schedule report"}
        </Button>
      </div>

      {showForm ? (
        <form
          action={(formData) => {
            startTransition(() => {
              showToast({ tone: "pending", message: "Saving schedule..." });
              action(formData);
            });
          }}
          className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Schedule name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekly stakeholder digest"
              error={state.fieldErrors?.name?.[0]}
            />
            <Input
              label="Recipient email"
              name="recipientEmail"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="client@company.com"
              error={state.fieldErrors?.recipientEmail?.[0]}
            />
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Format</span>
              <select
                name="format"
                value={format}
                onChange={(event) => setFormat(event.target.value as "csv" | "pdf")}
                className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Cadence</span>
              <select
                name="cadence"
                value={cadence}
                onChange={(event) => setCadence(event.target.value as "weekly" | "monthly")}
                className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
          <input type="hidden" name="range" value={String(currentRange)} />
          <input type="hidden" name="category" value={currentCategory} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Schedules the current filter set: {currentRange} days, {currentCategory}, {format.toUpperCase()}.
            </p>
            <Button type="submit" loading={isPending}>
              Save schedule
            </Button>
          </div>
        </form>
      ) : null}

      {schedules.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {schedules.map((schedule) => (
            <article key={schedule.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{schedule.name}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {schedule.cadence} • {schedule.format.toUpperCase()} • {schedule.range}d • {schedule.category}
                  </p>
                </div>
                <Badge tone={schedule.active ? "success" : "neutral"}>{schedule.active ? "Active" : "Paused"}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>Recipient: {schedule.recipient_email}</p>
                <p>Next run: {schedule.nextRunLabel}</p>
                <p>Last sent: {schedule.lastSentLabel ?? "Not sent yet"}</p>
                <p>Created: {schedule.relativeTime}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={isMutating && activeId === `${schedule.id}:run`}
                  onClick={() => {
                    startMutation(async () => {
                      setActiveId(`${schedule.id}:run`);
                      showToast({ tone: "pending", message: `Running ${schedule.name}...` });
                      const result = await runScheduledAnalyticsReportNow(schedule.id);
                      setActiveId(null);
                      if (result.message) {
                        showToast({
                          tone: result.success ? "success" : "error",
                          message: result.message,
                        });
                      }
                    });
                  }}
                >
                  Run now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={isMutating && activeId === schedule.id}
                  onClick={() => {
                    startMutation(async () => {
                      setActiveId(schedule.id);
                      showToast({
                        tone: "pending",
                        message: `${schedule.active ? "Pausing" : "Enabling"} ${schedule.name}...`,
                      });
                      const result = await toggleScheduledAnalyticsReport(schedule.id, !schedule.active);
                      setActiveId(null);
                      if (result.message) {
                        showToast({
                          tone: result.success ? "success" : "error",
                          message: result.message,
                        });
                      }
                    });
                  }}
                >
                  {schedule.active ? "Pause" : "Enable"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={isMutating && activeId === `${schedule.id}:delete`}
                  onClick={() => {
                    if (!window.confirm(`Delete scheduled report "${schedule.name}"?`)) {
                      return;
                    }

                    startMutation(async () => {
                      setActiveId(`${schedule.id}:delete`);
                      showToast({ tone: "pending", message: `Removing ${schedule.name}...` });
                      const result = await deleteScheduledAnalyticsReport(schedule.id);
                      setActiveId(null);
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
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-500">
          No scheduled reports yet. Save a recurring analytics package for a client, founder update, or internal review cadence.
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Recent delivery runs</p>
            <p className="mt-1 text-sm text-slate-500">
              Manual runs are recorded here now, and the same log can back background delivery workers later.
            </p>
          </div>
          <Badge tone="neutral">{runs.length} logged</Badge>
        </div>

        {runs.length > 0 ? (
          <div className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {run.delivery_mode === "manual" ? "Manual delivery" : "Scheduled delivery"} • {run.report_format.toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {run.range}d • {run.category} • {run.recipient_email}
                    </p>
                  </div>
                  <Badge tone={run.status === "delivered" ? "success" : "warning"}>{run.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Delivered: {run.deliveredLabel ?? "Pending"} • Logged {run.relativeTime}
                </p>
                {run.error_message ? <p className="mt-2 text-sm text-red-600">{run.error_message}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-5 text-sm leading-7 text-slate-500">
            No delivery runs yet. Use <span className="font-medium text-slate-900">Run now</span> on a schedule to test the delivery path and record the result.
          </div>
        )}
      </div>
    </section>
  );
}
