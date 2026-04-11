import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
  AnalyticsEvent,
  AnalyticsSeriesDatum,
  DashboardStat,
  EventBreakdownDatum,
  Profile,
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

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
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

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);

  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffMonths / 12);
  return formatter.format(diffYears, "year");
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

function getRevenueWeight(eventName: string) {
  switch (eventName) {
    case "conversion_recorded":
      return 900;
    case "project_completed":
      return 480;
    case "team_invited":
      return 220;
    case "project_created":
      return 180;
    case "project_member_added":
      return 90;
    default:
      return 60;
  }
}

function formatTrendPercentage(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "0.0%" : "+100.0%";
  }

  const delta = ((current - previous) / previous) * 100;
  const signed = delta >= 0 ? "+" : "";
  return `${signed}${delta.toFixed(1)}%`;
}

function getRangeTotal(events: AnalyticsEvent[], startDaysAgo: number, endDaysAgo = 0, predicate?: (event: AnalyticsEvent) => boolean) {
  const now = Date.now();
  const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
  const end = now - endDaysAgo * 24 * 60 * 60 * 1000;

  return events.filter((event) => {
    const timestamp = new Date(event.recorded_at).getTime();
    return timestamp >= start && timestamp < end && (!predicate || predicate(event));
  }).length;
}

export function buildRevenueFromEvents(events: AnalyticsEvent[]): RevenueDatum[] {
  const monthlyTotals = new Map<string, number>();

  for (const event of events) {
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(event.recorded_at));
    monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + Number(event.value) * getRevenueWeight(event.event_name));
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
    current.revenue += Number(event.value) * getRevenueWeight(event.event_name);
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

export function buildDashboardStats(projects: Project[], events: AnalyticsEvent[], team: Profile[]): DashboardStat[] {
  const revenueSeries = buildRevenueFromEvents(events);
  const currentRevenue = revenueSeries.at(-1)?.revenue ?? 0;
  const previousRevenue = revenueSeries.at(-2)?.revenue ?? 0;
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const currentProjectWindow = getRangeTotal(events, 30, 0, (event) => event.event_name === "project_created");
  const previousProjectWindow = getRangeTotal(events, 60, 30, (event) => event.event_name === "project_created");
  const now = Date.now();
  const currentTeamGrowth = team.filter((member) => {
    const createdAt = new Date(member.created_at).getTime();
    return createdAt >= now - 30 * 24 * 60 * 60 * 1000;
  }).length;
  const previousTeamGrowth = team.filter((member) => {
    const createdAt = new Date(member.created_at).getTime();
    return createdAt >= now - 60 * 24 * 60 * 60 * 1000 && createdAt < now - 30 * 24 * 60 * 60 * 1000;
  }).length;
  const completion = calculateProjectCompletion(projects);
  const currentCompletionSignal = getRangeTotal(events, 30, 0, (event) =>
    event.event_name === "project_completed" || event.event_name === "project_updated",
  );
  const previousCompletionSignal = getRangeTotal(events, 60, 30, (event) =>
    event.event_name === "project_completed" || event.event_name === "project_updated",
  );

  return [
    {
      label: "Total Revenue",
      value: formatCurrency(currentRevenue),
      trend: formatTrendPercentage(currentRevenue, previousRevenue),
      trendDirection: currentRevenue >= previousRevenue ? "up" : "down",
      icon: "revenue",
    },
    {
      label: "Active Projects",
      value: formatNumber(activeProjects),
      trend: formatTrendPercentage(currentProjectWindow, previousProjectWindow),
      trendDirection: currentProjectWindow >= previousProjectWindow ? "up" : "down",
      icon: "projects",
    },
    {
      label: "Team Members",
      value: formatNumber(team.length),
      trend: formatTrendPercentage(currentTeamGrowth, previousTeamGrowth),
      trendDirection: currentTeamGrowth >= previousTeamGrowth ? "up" : "down",
      icon: "team",
    },
    {
      label: "Tasks Completed",
      value: `${completion}%`,
      trend: formatTrendPercentage(currentCompletionSignal, previousCompletionSignal),
      trendDirection: currentCompletionSignal >= previousCompletionSignal ? "up" : "down",
      icon: "tasks",
    },
  ];
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
