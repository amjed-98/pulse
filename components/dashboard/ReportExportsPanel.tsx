import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import type { ReportExportWithMeta } from "@/lib/types";

interface ReportExportsPanelProps {
  title: string;
  description: string;
  exports: ReportExportWithMeta[];
  emptyMessage: string;
}

export function ReportExportsPanel(props: ReportExportsPanelProps) {
  const { title, description, exports, emptyMessage } = props;

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <Badge tone="neutral">{exports.length} recent</Badge>
      </div>

      {exports.length > 0 ? (
        <div className="mt-5 space-y-3">
          {exports.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.relativeTime} • {item.format.toUpperCase()} • {item.report_kind}
                </p>
              </div>
              <Link
                href={item.downloadPath}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Download again
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-6 text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
