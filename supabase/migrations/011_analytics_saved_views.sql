create table if not exists public.analytics_saved_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  range integer not null check (range in (7, 30, 90)),
  category text not null check (category in ('all', 'conversions', 'projects', 'team', 'billing')),
  created_at timestamptz not null default now()
);

create index if not exists analytics_saved_views_owner_id_idx
on public.analytics_saved_views (owner_id, created_at desc);

alter table public.analytics_saved_views enable row level security;

drop policy if exists "analytics_saved_views_select_own" on public.analytics_saved_views;
create policy "analytics_saved_views_select_own"
on public.analytics_saved_views
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "analytics_saved_views_insert_own" on public.analytics_saved_views;
create policy "analytics_saved_views_insert_own"
on public.analytics_saved_views
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "analytics_saved_views_update_own" on public.analytics_saved_views;
create policy "analytics_saved_views_update_own"
on public.analytics_saved_views
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "analytics_saved_views_delete_own" on public.analytics_saved_views;
create policy "analytics_saved_views_delete_own"
on public.analytics_saved_views
for delete
to authenticated
using (owner_id = auth.uid());
