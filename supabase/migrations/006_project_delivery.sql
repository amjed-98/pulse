create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists project_milestones_project_id_idx on public.project_milestones (project_id, due_date, created_at desc);
create index if not exists project_tasks_project_id_idx on public.project_tasks (project_id, status, created_at desc);
create index if not exists project_tasks_assignee_id_idx on public.project_tasks (assignee_id);

alter table public.project_milestones enable row level security;
alter table public.project_tasks enable row level security;

drop policy if exists "project_milestones_select_visible" on public.project_milestones;
create policy "project_milestones_select_visible"
on public.project_milestones
for select
to authenticated
using (public.is_project_visible(project_id));

drop policy if exists "project_milestones_insert_manageable" on public.project_milestones;
create policy "project_milestones_insert_manageable"
on public.project_milestones
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

drop policy if exists "project_milestones_update_manageable" on public.project_milestones;
create policy "project_milestones_update_manageable"
on public.project_milestones
for update
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
)
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

drop policy if exists "project_milestones_delete_manageable" on public.project_milestones;
create policy "project_milestones_delete_manageable"
on public.project_milestones
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

drop policy if exists "project_tasks_select_visible" on public.project_tasks;
create policy "project_tasks_select_visible"
on public.project_tasks
for select
to authenticated
using (public.is_project_visible(project_id));

drop policy if exists "project_tasks_insert_manageable" on public.project_tasks;
create policy "project_tasks_insert_manageable"
on public.project_tasks
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

drop policy if exists "project_tasks_update_manageable" on public.project_tasks;
create policy "project_tasks_update_manageable"
on public.project_tasks
for update
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
)
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

drop policy if exists "project_tasks_delete_manageable" on public.project_tasks;
create policy "project_tasks_delete_manageable"
on public.project_tasks
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
