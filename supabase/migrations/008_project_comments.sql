create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid references public.project_tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists project_comments_project_id_created_at_idx
on public.project_comments (project_id, created_at desc);

create index if not exists project_comments_task_id_created_at_idx
on public.project_comments (task_id, created_at desc);

alter table public.project_comments enable row level security;

drop policy if exists "project_comments_select_visible" on public.project_comments;
create policy "project_comments_select_visible"
on public.project_comments
for select
to authenticated
using (public.is_project_visible(project_id));

drop policy if exists "project_comments_insert_visible" on public.project_comments;
create policy "project_comments_insert_visible"
on public.project_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.is_project_visible(project_id)
);

drop policy if exists "project_comments_delete_author_or_admin" on public.project_comments;
create policy "project_comments_delete_author_or_admin"
on public.project_comments
for delete
to authenticated
using (
  author_id = auth.uid()
  or exists (
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
