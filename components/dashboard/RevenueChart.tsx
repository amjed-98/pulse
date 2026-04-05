"use client";

import { Component, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { RevenueDatum } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data: RevenueDatum[];
}

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[320px] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-50 text-sm text-slate-500">
          Revenue chart is temporarily unavailable.
        </div>
      );
    }

    return this.props.children;
  }
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ChartErrorBoundary>
      <div className="surface-card rounded-[1.75rem] p-5">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Revenue</h2>
            <p className="text-sm text-slate-500">Six-month trend across subscriptions and expansion revenue.</p>
          </div>
          <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(14,165,233,0.08))] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] ring-1 ring-indigo-100">
            {formatCurrency(data[data.length - 1]?.revenue ?? 0)}
          </div>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="pulseRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 18px 42px -26px rgba(15,23,42,0.32)",
                }}
                formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fill="url(#pulseRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartErrorBoundary>
  );
}
