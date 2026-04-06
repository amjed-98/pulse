create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_visible" on public.audit_logs;
create policy "audit_logs_select_visible"
on public.audit_logs
for select
to authenticated
using (
  actor_id = auth.uid()
  or public.is_project_visible(project_id)
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own"
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_project_id_idx on public.audit_logs (project_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_event_type_idx on public.audit_logs (event_type);
