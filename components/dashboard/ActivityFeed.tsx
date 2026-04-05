import type { ActivityItem } from "@/lib/types";

const toneStyles = {
  project: "bg-indigo-50 text-indigo-700",
  team: "bg-sky-50 text-sky-700",
  revenue: "bg-emerald-50 text-emerald-700",
  system: "bg-slate-100 text-slate-600",
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="surface-card rounded-[1.75rem] p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">Recent activity</h2>
        <p className="text-sm text-slate-500">The latest moves across product, revenue, and team operations.</p>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-slate-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-2xl bg-slate-950 text-xs font-semibold text-white">{index + 1}</span>
                <h3 className="font-medium text-slate-900">{item.title}</h3>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneStyles[item.type]}`}>{item.timestamp}</span>
            </div>
            <p className="text-sm leading-6 text-slate-500">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
