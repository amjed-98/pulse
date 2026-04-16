import { NextResponse } from "next/server";

import { filterEventsByCategory, filterEventsByDays, getWorkspaceAnalyticsEvents } from "@/lib/data";
import { buildAnalyticsEventsCsv } from "@/lib/export";

const ranges = [7, 30, 90] as const;
const categories = ["all", "conversions", "projects", "team", "billing"] as const;

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = ranges.includes(Number(searchParams.get("range")) as (typeof ranges)[number])
    ? (Number(searchParams.get("range")) as (typeof ranges)[number])
    : 30;
  const category = categories.includes((searchParams.get("category") ?? "all") as (typeof categories)[number])
    ? ((searchParams.get("category") ?? "all") as (typeof categories)[number])
    : "all";

  const events = filterEventsByCategory(filterEventsByDays(await getWorkspaceAnalyticsEvents(), range), category);
  const csv = buildAnalyticsEventsCsv(events);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pulse-analytics-${category}-${range}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
