import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { filterEventsByDays, getAnalyticsEvents } from "@/lib/data";
import { buildAnalyticsSeries, buildEventBreakdown, formatNumber } from "@/lib/utils";

const ranges = [7, 30, 90] as const;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Analytics",
    description: "Deep-dive analytics and event performance in Pulse.",
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = ranges.includes(Number(params.range) as (typeof ranges)[number])
    ? (Number(params.range) as (typeof ranges)[number])
    : 30;

  const events = filterEventsByDays(await getAnalyticsEvents(), range);
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
          <p className="mt-2 text-sm text-slate-500">Review performance trends across the last {range} days.</p>
        </div>
        <div className="flex gap-2">
          {ranges.map((option) => (
            <Link
              key={option}
              href={`/analytics?range=${option}`}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                range === option
                  ? "bg-[var(--color-accent)] text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-accent-strong)]"
                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              Last {option}d
            </Link>
          ))}
        </div>
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

      <AnalyticsCharts series={series} eventsByType={eventsByType} />
    </div>
  );
}
