import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsPresetActions } from "@/components/dashboard/AnalyticsPresetActions";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { AnalyticsSavedViews } from "@/components/dashboard/AnalyticsSavedViews";
import { DemoPreviewNotice } from "@/components/dashboard/DemoPreviewNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ReportExportsPanel } from "@/components/dashboard/ReportExportsPanel";
import { WorkspaceSetupCard } from "@/components/dashboard/WorkspaceSetupCard";
import { Button } from "@/components/ui/Button";
import { ANALYTICS_REPORT_PRESETS } from "@/lib/constants";
import { filterEventsByCategory, filterEventsByDays, getAnalyticsReportExports, getAnalyticsSavedViews, getWorkspaceAnalyticsEvents, getWorkspaceReadiness } from "@/lib/data";
import { publicEnv } from "@/lib/env";
import { buildAnalyticsSeries, buildEventBreakdown, formatNumber } from "@/lib/utils";

const ranges = [7, 30, 90] as const;
const categories = ["all", "conversions", "projects", "team", "billing"] as const;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Analytics",
    description: "Deep-dive analytics and event performance in Pulse.",
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; category?: string; report?: string; view?: string }>;
}) {
  const params = await searchParams;
  const savedViews = await getAnalyticsSavedViews();
  const selectedView = savedViews.find((item) => item.id === params.view) ?? null;
  const preset = ANALYTICS_REPORT_PRESETS.find((item) => item.id === params.report) ?? null;
  const rangeValue = params.range ?? (selectedView ? String(selectedView.range) : preset ? String(preset.range) : undefined);
  const categoryValue = params.category ?? selectedView?.category ?? preset?.category ?? "all";
  const range = ranges.includes(Number(rangeValue) as (typeof ranges)[number])
    ? (Number(rangeValue) as (typeof ranges)[number])
    : 30;
  const category = categories.includes(categoryValue as (typeof categories)[number])
    ? (categoryValue as (typeof categories)[number])
    : "all";
  const shareQuery = new URLSearchParams({
    range: String(range),
    category,
  });

  if (preset) {
    shareQuery.set("report", preset.id);
  }

  const shareUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/analytics?${shareQuery.toString()}`;

  const [allEvents, readiness, reportExports] = await Promise.all([
    getWorkspaceAnalyticsEvents(),
    getWorkspaceReadiness(),
    getAnalyticsReportExports(),
  ]);
  const events = filterEventsByCategory(filterEventsByDays(allEvents, range), category);
  const series = buildAnalyticsSeries(events, range);
  const eventsByType = buildEventBreakdown(events);
  const totalEvents = events.length;
  const uniqueUsers = new Set(events.map((event) => event.user_id)).size;
  const avgSession = `${Math.max(3.2, Number((totalEvents / Math.max(uniqueUsers, 1)).toFixed(1)))} min`;
  const conversionRate = `${Math.min(68, Math.round((events.filter((event) => event.event_name.includes("conversion")).length / Math.max(totalEvents, 1)) * 1000) / 10)}%`;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Usage and revenue signals</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review {category === "all" ? "all event" : `${category}`} performance across the last {range} days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnalyticsPresetActions shareUrl={shareUrl} />
          <a
            href={`/api/export/analytics?range=${range}&category=${category}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Export CSV
          </a>
          <a
            href={`/api/export/analytics?range=${range}&category=${category}&format=pdf`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Export PDF
          </a>
          {ranges.map((option) => (
            <Link
              key={option}
              href={`/analytics?range=${option}&category=${category}`}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === option
                  ? "bg-[var(--color-accent)] !text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-accent-strong)]"
                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
            >
              Last {option}d
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {ANALYTICS_REPORT_PRESETS.map((item) => {
          const href = `/analytics?report=${item.id}&range=${item.range}&category=${item.category}`;
          const isActive = preset?.id === item.id || (range === item.range && category === item.category);

          return (
            <Link
              key={item.id}
              href={href}
              className={`rounded-[1.5rem] border p-4 transition ${
                isActive ? "border-indigo-200 bg-indigo-50/70 shadow-[var(--shadow-soft)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-semibold text-slate-950">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                {item.range}d • {item.category}
              </p>
            </Link>
          );
        })}
      </section>

      <AnalyticsSavedViews
        views={savedViews}
        currentRange={range}
        currentCategory={category}
        activeViewId={selectedView?.id ?? null}
      />

      <ReportExportsPanel
        title="Recent exports"
        description="Every export is recorded so teams can rerun the same analytics package without rebuilding filters manually."
        exports={reportExports}
        emptyMessage="Exports appear here after you download CSV or PDF reports from this analytics view."
      />

      <section className="flex flex-wrap gap-2">
        {categories.map((option) => (
          <Link
            key={option}
            href={`/analytics?range=${range}&category=${option}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              category === option
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {option === "all" ? "All events" : option[0].toUpperCase() + option.slice(1)}
          </Link>
        ))}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Events", value: formatNumber(totalEvents) },
          { label: "Unique Users", value: formatNumber(uniqueUsers) },
          { label: "Avg Session", value: avgSession },
          { label: "Conversion Rate", value: conversionRate },
        ].map((item) => (
          <article key={item.label} className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
          </article>
        ))}
      </section>

      {allEvents.length > 0 ? (
        <AnalyticsCharts series={series} eventsByType={eventsByType} />
      ) : (
        <>
          <DemoPreviewNotice
            title="Analytics needs live instrumentation"
            description="This screen is intentionally empty until the workspace captures real events. That keeps the product credible instead of fabricating metrics where none exist."
          />
          <EmptyState
            eyebrow="Analytics"
            title="No live events captured"
            description="Once events start flowing into Supabase, this page becomes a real proof point for instrumentation quality, trend analysis, and revenue storytelling."
            actions={
              <Link href="/dashboard">
                <Button>Back to overview</Button>
              </Link>
            }
            aside={
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Suggested first events</p>
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  <li>`project_created` when a new initiative is opened.</li>
                  <li>`team_invited` when an admin sends a workspace invite.</li>
                  <li>`conversion_recorded` or business-specific actions tied to value.</li>
                </ul>
              </div>
            }
          />
          <WorkspaceSetupCard
            readiness={readiness}
            title="Instrumentation readiness"
            description="The rest of the product is ready for live analytics, but the charts only become meaningful after real event capture starts."
          />
        </>
      )}
    </div>
  );
}
