create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  asset_type text not null default 'attachment' check (asset_type in ('cover', 'attachment')),
  file_name text not null,
  object_path text not null unique,
  content_type text,
  file_size bigint not null check (file_size >= 0),
  created_at timestamptz not null default now()
);

create index if not exists project_assets_project_id_idx on public.project_assets (project_id, created_at desc);
create index if not exists project_assets_uploaded_by_idx on public.project_assets (uploaded_by);

alter table public.project_assets enable row level security;

drop policy if exists "project_assets_select_visible" on public.project_assets;
create policy "project_assets_select_visible"
on public.project_assets
for select
to authenticated
using (public.is_project_visible(project_id));

drop policy if exists "project_assets_insert_manageable" on public.project_assets;
create policy "project_assets_insert_manageable"
on public.project_assets
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
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

drop policy if exists "project_assets_delete_manageable" on public.project_assets;
create policy "project_assets_delete_manageable"
on public.project_assets
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  20971520,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/markdown',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_assets_public_read" on storage.objects;
create policy "project_assets_public_read"
on storage.objects
for select
to public
using (bucket_id = 'project-assets');

drop policy if exists "project_assets_insert_own_project" on storage.objects;
create policy "project_assets_insert_own_project"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-assets'
  and auth.uid() is not null
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
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

drop policy if exists "project_assets_delete_own_project" on storage.objects;
create policy "project_assets_delete_own_project"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-assets'
  and auth.uid() is not null
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
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
