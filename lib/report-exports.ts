import { createAuditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, ReportExport, ReportFormat, ReportKind } from "@/lib/types";

interface CreateReportExportInput {
  ownerId: string;
  title: string;
  reportKind: ReportKind;
  format: ReportFormat;
  filters?: Json;
  projectId?: string | null;
}

export function buildReportExportPath(record: Pick<ReportExport, "report_kind" | "format" | "project_id" | "filters">) {
  if (record.report_kind === "analytics") {
    const filters = (record.filters ?? {}) as Record<string, string | number | undefined>;
    const query = new URLSearchParams();

    if (filters.range) {
      query.set("range", String(filters.range));
    }

    if (filters.category) {
      query.set("category", String(filters.category));
    }

    if (filters.report) {
      query.set("report", String(filters.report));
    }

    if (record.format !== "csv") {
      query.set("format", record.format);
    }

    const suffix = query.toString();
    return `/api/export/analytics${suffix ? `?${suffix}` : ""}`;
  }

  if (!record.project_id) {
    return "#";
  }

  const query = record.format === "md" ? "" : `?format=${record.format}`;
  return `/api/export/projects/${record.project_id}${query}`;
}

export async function createReportExportRecord(input: CreateReportExportInput) {
  try {
    const supabase = await createSupabaseServerClient();

    await supabase.from("report_exports").insert({
      owner_id: input.ownerId,
      project_id: input.projectId ?? null,
      report_kind: input.reportKind,
      format: input.format,
      title: input.title,
      filters: input.filters ?? {},
    });

    await createAuditLog({
      actorId: input.ownerId,
      title: `Exported ${input.title}`,
      description: `${input.reportKind} report exported as ${input.format.toUpperCase()}.`,
      eventType: "analytics.report_exported",
      projectId: input.projectId ?? null,
      metadata: {
        reportKind: input.reportKind,
        format: input.format,
        filters: input.filters ?? {},
      },
    });
  } catch {
    // Export delivery should still succeed even if reporting history is unavailable.
  }
}
