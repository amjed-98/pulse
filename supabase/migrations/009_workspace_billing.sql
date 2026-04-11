create table if not exists public.workspace_billing (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'scale')),
  status text not null default 'trialing' check (status in ('active', 'past_due', 'trialing')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_billing_owner_id_idx on public.workspace_billing (owner_id);

create or replace function public.touch_workspace_billing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_workspace_billing_updated on public.workspace_billing;
create trigger on_workspace_billing_updated
before update on public.workspace_billing
for each row execute function public.touch_workspace_billing_updated_at();

alter table public.workspace_billing enable row level security;

drop policy if exists "workspace_billing_read_authenticated" on public.workspace_billing;
create policy "workspace_billing_read_authenticated"
on public.workspace_billing
for select
to authenticated
using (true);

drop policy if exists "workspace_billing_insert_admin" on public.workspace_billing;
create policy "workspace_billing_insert_admin"
on public.workspace_billing
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "workspace_billing_update_admin" on public.workspace_billing;
create policy "workspace_billing_update_admin"
on public.workspace_billing
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);
