create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  report_kind text not null check (report_kind in ('analytics', 'project')),
  format text not null check (format in ('csv', 'pdf', 'md')),
  title text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.report_exports enable row level security;

create index if not exists report_exports_owner_created_idx
  on public.report_exports (owner_id, created_at desc);

create index if not exists report_exports_project_created_idx
  on public.report_exports (project_id, created_at desc)
  where project_id is not null;

create policy "Users can read their own report exports"
on public.report_exports
for select
to authenticated
using (owner_id = auth.uid());

create policy "Users can create their own report exports"
on public.report_exports
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and (
    project_id is null
    or public.is_project_visible(project_id)
  )
);
