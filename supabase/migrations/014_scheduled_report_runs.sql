create table if not exists public.scheduled_report_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.scheduled_reports(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  report_format text not null check (report_format in ('csv', 'pdf')),
  range integer not null check (range in (7, 30, 90)),
  category text not null check (category in ('all', 'conversions', 'projects', 'team', 'billing')),
  status text not null check (status in ('delivered', 'failed')),
  delivery_mode text not null check (delivery_mode in ('manual', 'scheduled')),
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.scheduled_report_runs enable row level security;

create index if not exists scheduled_report_runs_owner_created_idx
  on public.scheduled_report_runs (owner_id, created_at desc);

create index if not exists scheduled_report_runs_schedule_created_idx
  on public.scheduled_report_runs (schedule_id, created_at desc);

create policy "Users can read their own scheduled report runs"
on public.scheduled_report_runs
for select
to authenticated
using (owner_id = auth.uid());

create policy "Users can create their own scheduled report runs"
on public.scheduled_report_runs
for insert
to authenticated
with check (owner_id = auth.uid());
