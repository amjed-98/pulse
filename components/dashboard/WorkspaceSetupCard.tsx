import type { WorkspaceReadiness } from "@/lib/types";

interface WorkspaceSetupCardProps {
  readiness: WorkspaceReadiness;
  title?: string;
  description?: string;
}

export function WorkspaceSetupCard({
  readiness,
  title = "Workspace setup",
  description = "Turn the portfolio shell into a credible product story with live records, real activity, and clear operator workflows.",
}: WorkspaceSetupCardProps) {
  const completed = readiness.checklist.filter((item) => item.done).length;

  return (
    <section className="surface-card rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {completed}/{readiness.checklist.length} milestones complete
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
        </div>
        <div className="min-w-52 rounded-[1.5rem] border border-slate-100 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live status</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div>
              <dt>Projects</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-950">{readiness.liveProjectCount}</dd>
            </div>
            <div>
              <dt>Events</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-950">{readiness.liveEventCount}</dd>
            </div>
            <div>
              <dt>Team</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-950">{readiness.teamCount}</dd>
            </div>
            <div>
              <dt>Activity</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-950">{readiness.activityCount}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {readiness.checklist.map((item) => (
          <article key={item.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  item.done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.done ? "OK" : "TO"}
              </div>
              <div>
                <h3 className="font-medium text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
