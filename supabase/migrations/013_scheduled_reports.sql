create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  report_kind text not null check (report_kind in ('analytics')),
  range integer not null check (range in (7, 30, 90)),
  category text not null check (category in ('all', 'conversions', 'projects', 'team', 'billing')),
  format text not null check (format in ('csv', 'pdf')),
  cadence text not null check (cadence in ('weekly', 'monthly')),
  recipient_email text not null,
  active boolean not null default true,
  last_sent_at timestamptz,
  next_run_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.scheduled_reports enable row level security;

create index if not exists scheduled_reports_owner_created_idx
  on public.scheduled_reports (owner_id, created_at desc);

create policy "Users can read their own scheduled reports"
on public.scheduled_reports
for select
to authenticated
using (owner_id = auth.uid());

create policy "Users can create their own scheduled reports"
on public.scheduled_reports
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Users can update their own scheduled reports"
on public.scheduled_reports
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete their own scheduled reports"
on public.scheduled_reports
for delete
to authenticated
using (owner_id = auth.uid());
