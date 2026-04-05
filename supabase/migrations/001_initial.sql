create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_name text not null,
  value numeric not null default 0,
  recorded_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_project_visible(project_uuid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project_uuid
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_delete_admin_or_self" on public.profiles;
create policy "profiles_delete_admin_or_self"
on public.profiles
for delete
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "projects_select_visible" on public.projects;
create policy "projects_select_visible"
on public.projects
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "projects_insert_owner" on public.projects;
create policy "projects_insert_owner"
on public.projects
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "projects_update_owner_or_admin" on public.projects;
create policy "projects_update_owner_or_admin"
on public.projects
for update
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "projects_delete_owner_or_admin" on public.projects;
create policy "projects_delete_owner_or_admin"
on public.projects
for delete
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "project_members_select_visible" on public.project_members;
create policy "project_members_select_visible"
on public.project_members
for select
to authenticated
using (public.is_project_visible(project_id));

drop policy if exists "project_members_insert_project_owner" on public.project_members;
create policy "project_members_insert_project_owner"
on public.project_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.profiles current_profile
          where current_profile.id = auth.uid()
            and current_profile.role = 'admin'
        )
      )
  )
);

drop policy if exists "project_members_delete_project_owner" on public.project_members;
create policy "project_members_delete_project_owner"
on public.project_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.profiles current_profile
          where current_profile.id = auth.uid()
            and current_profile.role = 'admin'
        )
      )
  )
);

drop policy if exists "analytics_select_own" on public.analytics_events;
create policy "analytics_select_own"
on public.analytics_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "analytics_insert_own" on public.analytics_events;
create policy "analytics_insert_own"
on public.analytics_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "analytics_update_own" on public.analytics_events;
create policy "analytics_update_own"
on public.analytics_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists project_members_user_id_idx on public.project_members (user_id);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_recorded_at_idx on public.analytics_events (recorded_at desc);
