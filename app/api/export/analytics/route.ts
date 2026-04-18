import { NextResponse } from "next/server";

import { filterEventsByCategory, filterEventsByDays, getWorkspaceAnalyticsEvents } from "@/lib/data";
import { buildAnalyticsEventsCsv, buildAnalyticsReportPdf } from "@/lib/export";
import { createReportExportRecord } from "@/lib/report-exports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ranges = [7, 30, 90] as const;
const categories = ["all", "conversions", "projects", "team", "billing"] as const;
const formats = ["csv", "pdf"] as const;

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = ranges.includes(Number(searchParams.get("range")) as (typeof ranges)[number])
    ? (Number(searchParams.get("range")) as (typeof ranges)[number])
    : 30;
  const category = categories.includes((searchParams.get("category") ?? "all") as (typeof categories)[number])
    ? ((searchParams.get("category") ?? "all") as (typeof categories)[number])
    : "all";
  const format = formats.includes((searchParams.get("format") ?? "csv") as (typeof formats)[number])
    ? ((searchParams.get("format") ?? "csv") as (typeof formats)[number])
    : "csv";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const events = filterEventsByCategory(filterEventsByDays(await getWorkspaceAnalyticsEvents(), range), category);

  if (user) {
    await createReportExportRecord({
      ownerId: user.id,
      title: `Analytics ${category} report`,
      reportKind: "analytics",
      format,
      filters: {
        range,
        category,
      },
    });
  }

  if (format === "pdf") {
    const pdf = await buildAnalyticsReportPdf(events, range, category);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pulse-analytics-${category}-${range}d.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

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
