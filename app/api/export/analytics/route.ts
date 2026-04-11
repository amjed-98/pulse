import { NextResponse } from "next/server";

import { filterEventsByDays, getWorkspaceAnalyticsEvents } from "@/lib/data";
import { buildAnalyticsEventsCsv } from "@/lib/export";

const ranges = [7, 30, 90] as const;

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = ranges.includes(Number(searchParams.get("range")) as (typeof ranges)[number])
    ? (Number(searchParams.get("range")) as (typeof ranges)[number])
    : 30;

  const events = filterEventsByDays(await getWorkspaceAnalyticsEvents(), range);
  const csv = buildAnalyticsEventsCsv(events);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pulse-analytics-${range}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
