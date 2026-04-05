import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
  AnalyticsEvent,
  AnalyticsSeriesDatum,
  EventBreakdownDatum,
  Project,
  ProjectStatus,
  RevenueDatum,
} from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "No date set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function getStatusTone(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "completed":
      return "info";
    case "archived":
      return "neutral";
    default:
      return "neutral";
  }
}

export function buildRevenueFromEvents(events: AnalyticsEvent[]): RevenueDatum[] {
  const monthlyTotals = new Map<string, number>();

  for (const event of events) {
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(event.recorded_at));
    monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + Number(event.value) * 140);
  }

  return Array.from(monthlyTotals.entries()).map(([month, revenue], index) => ({
    month,
    revenue,
    expenses: Math.round(revenue * (0.42 + index * 0.01)),
  }));
}

export function buildAnalyticsSeries(events: AnalyticsEvent[], days: number): AnalyticsSeriesDatum[] {
  const today = new Date();
  const buckets = new Map<string, AnalyticsSeriesDatum>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
    buckets.set(label, { label, users: 0, revenue: 0, sessions: 0 });
  }

  for (const event of events) {
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(event.recorded_at));
    const current = buckets.get(label);

    if (!current) {
      continue;
    }

    current.users += 1;
    current.revenue += Number(event.value) * 120;
    current.sessions += Math.max(1, Math.round(Number(event.value)));
  }

  return Array.from(buckets.values());
}

export function buildEventBreakdown(events: AnalyticsEvent[]): EventBreakdownDatum[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.event_name, (counts.get(event.event_name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([event, total]) => ({ event, total }))
    .sort((left, right) => right.total - left.total);
}

export function calculateProjectCompletion(projects: Project[]) {
  if (!projects.length) {
    return 0;
  }

  return Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length);
}

export function getInitials(name?: string | null) {
  if (!name) {
    return "PU";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
