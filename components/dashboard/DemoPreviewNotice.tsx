interface DemoPreviewNoticeProps {
  title: string;
  description: string;
}

export function DemoPreviewNotice({ title, description }: DemoPreviewNoticeProps) {
  return (
    <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(180deg,rgba(238,242,255,0.95),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Demo preview</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}
