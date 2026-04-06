create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite public.workspace_invites;
begin
  select *
  into matched_invite
  from public.workspace_invites wi
  where lower(wi.email) = lower(new.email)
    and wi.status = 'pending'
  order by wi.invited_at desc
  limit 1;

  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    coalesce(matched_invite.role, 'member')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    role = coalesce(matched_invite.role, public.profiles.role);

  if matched_invite.id is not null then
    update public.workspace_invites
    set status = 'accepted',
        accepted_at = now()
    where id = matched_invite.id;
  end if;

  return new;
end;
$$;

alter table public.workspace_invites enable row level security;

drop policy if exists "workspace_invites_admin_read" on public.workspace_invites;
create policy "workspace_invites_admin_read"
on public.workspace_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "workspace_invites_admin_insert" on public.workspace_invites;
create policy "workspace_invites_admin_insert"
on public.workspace_invites
for insert
to authenticated
with check (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "workspace_invites_admin_update" on public.workspace_invites;
create policy "workspace_invites_admin_update"
on public.workspace_invites
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

drop policy if exists "profiles_update_admin_or_self" on public.profiles;
create policy "profiles_update_admin_or_self"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
)
with check (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.role = 'admin'
  )
);

drop policy if exists "profiles_update_own" on public.profiles;

create index if not exists workspace_invites_email_idx on public.workspace_invites (lower(email));
create index if not exists workspace_invites_status_idx on public.workspace_invites (status);
create index if not exists workspace_invites_invited_at_idx on public.workspace_invites (invited_at desc);
