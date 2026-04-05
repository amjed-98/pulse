"use client";

import { Component, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsSeriesDatum, EventBreakdownDatum } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

class ChartsBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          Analytics charts are temporarily unavailable.
        </div>
      );
    }

    return this.props.children;
  }
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="h-[320px]">{children}</div>
    </section>
  );
}

interface AnalyticsChartsProps {
  series: AnalyticsSeriesDatum[];
  eventsByType: EventBreakdownDatum[];
}

export function AnalyticsCharts({ series, eventsByType }: AnalyticsChartsProps) {
  return (
    <ChartsBoundary>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Daily active users" description="Users interacting with your workspace during the selected period.">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="analyticsUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#0ea5e9" fill="url(#analyticsUsers)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Events by type" description="Most frequent actions captured by the instrumentation layer.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eventsByType}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="event" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#4f46e5" radius={[14, 14, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue over time" description="Revenue modeled from conversion activity to show directional momentum.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              />
              <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </ChartsBoundary>
  );
}
