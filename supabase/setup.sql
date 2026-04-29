-- Project Tracker Workspace — Supabase setup
-- Run this file once in Supabase SQL Editor for a new project.
-- It consolidates the required schema, auth/RLS, collaboration, subtasks, audit and presence SQL into one ordered script.
-- Do not run the old patch files separately; they were intentionally removed from this clean archive.



-- =====================================================================
-- Source: schema.sql
-- =====================================================================

-- Project Tracker shared database for Supabase/PostgreSQL
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text,
  status text not null default 'planned' check (status in ('idea','planned','in_progress','waiting','done')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  deadline date,
  next_step text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  assignee text,
  status text not null default 'planned' check (status in ('planned','in_progress','waiting','done')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('project','task','system')),
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_priority on public.projects(priority);
create index if not exists idx_projects_deadline on public.projects(deadline);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_activity_entity on public.activity_log(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- MVP access model.
-- This makes the shared database editable by anyone who has the site URL and anon key.
-- For private production use, replace these policies with authenticated-user policies.
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;
alter table public.settings enable row level security;

drop policy if exists "project_tracker_projects_select" on public.projects;
drop policy if exists "project_tracker_projects_insert" on public.projects;
drop policy if exists "project_tracker_projects_update" on public.projects;
drop policy if exists "project_tracker_projects_delete" on public.projects;
create policy "project_tracker_projects_select" on public.projects for select to anon using (true);
create policy "project_tracker_projects_insert" on public.projects for insert to anon with check (true);
create policy "project_tracker_projects_update" on public.projects for update to anon using (true) with check (true);
create policy "project_tracker_projects_delete" on public.projects for delete to anon using (true);

drop policy if exists "project_tracker_tasks_select" on public.tasks;
drop policy if exists "project_tracker_tasks_insert" on public.tasks;
drop policy if exists "project_tracker_tasks_update" on public.tasks;
drop policy if exists "project_tracker_tasks_delete" on public.tasks;
create policy "project_tracker_tasks_select" on public.tasks for select to anon using (true);
create policy "project_tracker_tasks_insert" on public.tasks for insert to anon with check (true);
create policy "project_tracker_tasks_update" on public.tasks for update to anon using (true) with check (true);
create policy "project_tracker_tasks_delete" on public.tasks for delete to anon using (true);

drop policy if exists "project_tracker_log_select" on public.activity_log;
drop policy if exists "project_tracker_log_insert" on public.activity_log;
create policy "project_tracker_log_select" on public.activity_log for select to anon using (true);
create policy "project_tracker_log_insert" on public.activity_log for insert to anon with check (true);

drop policy if exists "project_tracker_settings_select" on public.settings;
drop policy if exists "project_tracker_settings_upsert" on public.settings;
create policy "project_tracker_settings_select" on public.settings for select to anon using (true);
create policy "project_tracker_settings_upsert" on public.settings for all to anon using (true) with check (true);

-- Initial seed data.
insert into public.projects (id, name, owner, status, priority, deadline, next_step, description)
values
  ('11111111-1111-4111-8111-111111111111', 'Онлайн-клиника / консультационная платформа', 'Дмитрий', 'planned', 'high', '2026-05-26', 'Сформировать линейку первых консультационных продуктов', 'Экспертные консультации, сопровождение, разбор анализов и маршрутизация пациента.'),
  ('22222222-2222-4222-8222-222222222222', 'Стельки и ортопедические изделия', 'Производственный блок', 'planned', 'high', '2026-05-17', 'Снять полный цикл изготовления и посчитать себестоимость', 'Индивидуальные стельки, подошвы и кастомные решения.'),
  ('33333333-3333-4333-8333-333333333333', 'Упражнения и реабилитационный контент', 'Клинический блок', 'idea', 'medium', '2026-05-10', 'Собрать первые 10 базовых упражнений', 'Бесплатные и платные упражнения как продукт и контентная воронка.')
on conflict (id) do nothing;

insert into public.tasks (project_id, title, assignee, status, priority, due_date, notes)
values
  ('11111111-1111-4111-8111-111111111111', 'Описать первые консультационные продукты', 'Дмитрий', 'planned', 'high', '2026-05-01', 'Консультация, разбор анализов, сопровождение, второе мнение.'),
  ('22222222-2222-4222-8222-222222222222', 'Снять видео изготовления стелек', 'Производство', 'planned', 'high', '2026-05-06', 'Полный цикл: оценка, изготовление, готовое изделие.'),
  ('33333333-3333-4333-8333-333333333333', 'Собрать матрицу упражнений', 'Клинический блок', 'planned', 'medium', '2026-05-04', 'Разделить бесплатный и платный контур.');



-- =====================================================================
-- Source: migration_v2_workspace.sql
-- =====================================================================

-- Project Tracker Workspace v2 migration
-- Run this in Supabase SQL Editor after supabase/schema.sql.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  position text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists owner_id uuid references public.app_users(id) on delete set null;
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists color text default '#111827';
alter table public.projects add column if not exists sort_order int not null default 0;

alter table public.tasks add column if not exists assignee_id uuid references public.app_users(id) on delete set null;
alter table public.tasks add column if not exists start_date date;
alter table public.tasks add column if not exists sort_order int not null default 0;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  target_date date,
  status text not null default 'planned' check (status in ('planned','in_progress','done','blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_app_users_email on public.app_users(email);
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_projects_start_date on public.projects(start_date);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_tasks_start_date on public.tasks(start_date);
create index if not exists idx_milestones_project_id on public.project_milestones(project_id);
create index if not exists idx_milestones_target_date on public.project_milestones(target_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_milestones_updated_at on public.project_milestones;
create trigger trg_milestones_updated_at
before update on public.project_milestones
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.project_milestones enable row level security;

drop policy if exists "project_tracker_users_select" on public.app_users;
drop policy if exists "project_tracker_users_insert" on public.app_users;
drop policy if exists "project_tracker_users_update" on public.app_users;
drop policy if exists "project_tracker_users_delete" on public.app_users;
create policy "project_tracker_users_select" on public.app_users for select to anon using (true);
create policy "project_tracker_users_insert" on public.app_users for insert to anon with check (true);
create policy "project_tracker_users_update" on public.app_users for update to anon using (true) with check (true);
create policy "project_tracker_users_delete" on public.app_users for delete to anon using (true);

drop policy if exists "project_tracker_milestones_select" on public.project_milestones;
drop policy if exists "project_tracker_milestones_insert" on public.project_milestones;
drop policy if exists "project_tracker_milestones_update" on public.project_milestones;
drop policy if exists "project_tracker_milestones_delete" on public.project_milestones;
create policy "project_tracker_milestones_select" on public.project_milestones for select to anon using (true);
create policy "project_tracker_milestones_insert" on public.project_milestones for insert to anon with check (true);
create policy "project_tracker_milestones_update" on public.project_milestones for update to anon using (true) with check (true);
create policy "project_tracker_milestones_delete" on public.project_milestones for delete to anon using (true);

insert into public.app_users (display_name, email, role, position)
values
  ('Дмитрий', 'dmitry@example.local', 'owner', 'Клиническая логика / продукт'),
  ('Операционный блок', 'ops@example.local', 'admin', 'Процессы и сроки'),
  ('Клинический блок', 'clinical@example.local', 'member', 'Методология'),
  ('Маркетинг / веб', 'marketing@example.local', 'member', 'Упаковка и сайт')
on conflict (email) do nothing;

update public.projects p
set owner_id = u.id
from public.app_users u
where p.owner_id is null
  and (p.owner = u.display_name or p.owner ilike '%' || split_part(u.display_name, ' ', 1) || '%');

update public.tasks t
set assignee_id = u.id
from public.app_users u
where t.assignee_id is null
  and (t.assignee = u.display_name or t.assignee ilike '%' || split_part(u.display_name, ' ', 1) || '%');

insert into public.project_milestones (project_id, title, target_date, status, notes)
select id, 'MVP продукта описан', deadline, 'planned', 'Первый контрольный рубеж проекта'
from public.projects
where not exists (
  select 1 from public.project_milestones m where m.project_id = public.projects.id
);

-- Passwords should not be stored manually in app_users.
-- For real login/password use Supabase Authentication and link auth.users.id to app_users/auth profiles.



-- =====================================================================
-- Source: migration_v3_auth_permissions.sql
-- =====================================================================

-- Project Tracker Workspace v3: authentication, access rights, project visibility
-- Run this after:
-- 1) supabase/schema.sql
-- 2) supabase/migration_v2_workspace.sql
--
-- Goal:
-- - Supabase Auth is the source of passwords and login sessions.
-- - app_users stores profile, role and responsibility zone.
-- - project_members controls project visibility and edit rights.
-- - PostgreSQL RLS enforces access on the database level.

create extension if not exists pgcrypto;

alter table public.app_users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

create index if not exists idx_app_users_auth_user_id on public.app_users(auth_user_id);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  access_role text not null default 'viewer' check (access_role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create index if not exists idx_project_members_project_id on public.project_members(project_id);
create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_project_members_access_role on public.project_members(access_role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_project_members_updated_at on public.project_members;
create trigger trg_project_members_updated_at
before update on public.project_members
for each row execute function public.set_updated_at();

-- Current profile helpers.
create or replace function public.current_app_user_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select au.id
  from public.app_users au
  where au.auth_user_id = auth.uid()
     or (au.auth_user_id is null and lower(au.email) = lower(coalesce(auth.jwt() ->> 'email','')))
  order by au.auth_user_id nulls last
  limit 1;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('owner','admin')
  );
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_app_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.owner_id = public.current_app_user_id()
        and p.deleted_at is null
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = public.current_app_user_id()
    );
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_app_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.owner_id = public.current_app_user_id()
        and p.deleted_at is null
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = public.current_app_user_id()
        and pm.access_role in ('owner','editor')
    );
$$;

-- A logged-in user can claim a profile with matching email, or create a member profile.
create or replace function public.claim_app_user_profile()
returns public.app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  v_name text := coalesce(auth.jwt() #>> '{user_metadata,full_name}', split_part(v_email,'@',1), 'User');
  v_user public.app_users;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.app_users
  set auth_user_id = v_uid,
      updated_at = now(),
      is_active = true
  where auth_user_id is null
    and lower(email) = v_email
  returning * into v_user;

  if v_user.id is not null then
    return v_user;
  end if;

  select * into v_user
  from public.app_users
  where auth_user_id = v_uid;

  if v_user.id is not null then
    return v_user;
  end if;

  insert into public.app_users (auth_user_id, display_name, email, role, position, is_active)
  values (v_uid, v_name, v_email, 'member', null, true)
  returning * into v_user;

  return v_user;
end;
$$;

-- Bootstrap: first authenticated user can become workspace owner.
-- Allowed only while there is no linked owner/admin profile.
create or replace function public.bootstrap_workspace_owner()
returns public.app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  v_name text := coalesce(auth.jwt() #>> '{user_metadata,full_name}', split_part(v_email,'@',1), 'Owner');
  v_user public.app_users;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.app_users
    where auth_user_id is not null
      and role in ('owner','admin')
      and is_active = true
  ) then
    raise exception 'Workspace already has a linked owner/admin';
  end if;

  select * into v_user
  from public.app_users
  where auth_user_id = v_uid
     or lower(email) = v_email
  limit 1;

  if v_user.id is null then
    insert into public.app_users (auth_user_id, display_name, email, role, position, is_active)
    values (v_uid, v_name, v_email, 'owner', 'Workspace owner', true)
    returning * into v_user;
  else
    update public.app_users
    set auth_user_id = v_uid,
        email = coalesce(email, v_email),
        role = 'owner',
        is_active = true,
        updated_at = now()
    where id = v_user.id
    returning * into v_user;
  end if;

  update public.projects
  set owner_id = v_user.id
  where owner_id is null;

  insert into public.project_members (project_id, user_id, access_role)
  select p.id, v_user.id, 'owner'
  from public.projects p
  where p.deleted_at is null
  on conflict (project_id, user_id) do update set access_role = 'owner';

  return v_user;
end;
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.claim_app_user_profile() to authenticated;
grant execute on function public.bootstrap_workspace_owner() to authenticated;

-- Replace MVP anon policies with authenticated policies.
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;
alter table public.settings enable row level security;
alter table public.app_users enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_members enable row level security;

-- Drop old permissive policies from v1/v2.
drop policy if exists "project_tracker_projects_select" on public.projects;
drop policy if exists "project_tracker_projects_insert" on public.projects;
drop policy if exists "project_tracker_projects_update" on public.projects;
drop policy if exists "project_tracker_projects_delete" on public.projects;
drop policy if exists "project_tracker_tasks_select" on public.tasks;
drop policy if exists "project_tracker_tasks_insert" on public.tasks;
drop policy if exists "project_tracker_tasks_update" on public.tasks;
drop policy if exists "project_tracker_tasks_delete" on public.tasks;
drop policy if exists "project_tracker_log_select" on public.activity_log;
drop policy if exists "project_tracker_log_insert" on public.activity_log;
drop policy if exists "project_tracker_settings_select" on public.settings;
drop policy if exists "project_tracker_settings_upsert" on public.settings;
drop policy if exists "project_tracker_users_select" on public.app_users;
drop policy if exists "project_tracker_users_insert" on public.app_users;
drop policy if exists "project_tracker_users_update" on public.app_users;
drop policy if exists "project_tracker_users_delete" on public.app_users;
drop policy if exists "project_tracker_milestones_select" on public.project_milestones;
drop policy if exists "project_tracker_milestones_insert" on public.project_milestones;
drop policy if exists "project_tracker_milestones_update" on public.project_milestones;
drop policy if exists "project_tracker_milestones_delete" on public.project_milestones;

-- app_users
create policy "app_users_select_authenticated" on public.app_users
for select to authenticated using (true);

create policy "app_users_insert_admin" on public.app_users
for insert to authenticated with check (public.is_app_admin());

create policy "app_users_update_admin" on public.app_users
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "app_users_update_self_safe" on public.app_users
for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid() and role in ('member','viewer'));

create policy "app_users_delete_admin" on public.app_users
for delete to authenticated using (public.is_app_admin());

-- project_members
create policy "project_members_select_visible" on public.project_members
for select to authenticated
using (public.is_app_admin() or user_id = public.current_app_user_id() or public.can_view_project(project_id));

create policy "project_members_insert_admin_or_owner" on public.project_members
for insert to authenticated
with check (
  public.is_app_admin()
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = public.current_app_user_id()
      and pm.access_role = 'owner'
  )
);

create policy "project_members_update_admin_or_owner" on public.project_members
for update to authenticated
using (
  public.is_app_admin()
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = public.current_app_user_id()
      and pm.access_role = 'owner'
  )
)
with check (
  public.is_app_admin()
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = public.current_app_user_id()
      and pm.access_role = 'owner'
  )
);

create policy "project_members_delete_admin_or_owner" on public.project_members
for delete to authenticated
using (
  public.is_app_admin()
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = public.current_app_user_id()
      and pm.access_role = 'owner'
  )
);

-- projects
create policy "projects_select_visible" on public.projects
for select to authenticated using (deleted_at is null and public.can_view_project(id));

create policy "projects_insert_authenticated_owner" on public.projects
for insert to authenticated
with check (owner_id = public.current_app_user_id() or public.is_app_admin());

create policy "projects_update_editors" on public.projects
for update to authenticated
using (public.can_edit_project(id))
with check (public.can_edit_project(id));

create policy "projects_delete_admin" on public.projects
for delete to authenticated using (public.is_app_admin());

-- tasks
create policy "tasks_select_visible_project" on public.tasks
for select to authenticated using (deleted_at is null and public.can_view_project(project_id));

create policy "tasks_insert_project_editors" on public.tasks
for insert to authenticated with check (public.can_edit_project(project_id));

create policy "tasks_update_project_editors" on public.tasks
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "tasks_delete_project_editors" on public.tasks
for delete to authenticated using (public.can_edit_project(project_id));

-- milestones
create policy "milestones_select_visible_project" on public.project_milestones
for select to authenticated using (deleted_at is null and public.can_view_project(project_id));

create policy "milestones_insert_project_editors" on public.project_milestones
for insert to authenticated with check (public.can_edit_project(project_id));

create policy "milestones_update_project_editors" on public.project_milestones
for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy "milestones_delete_project_editors" on public.project_milestones
for delete to authenticated using (public.can_edit_project(project_id));

-- activity log
create policy "activity_log_select_admin" on public.activity_log
for select to authenticated using (public.is_app_admin());

create policy "activity_log_insert_authenticated" on public.activity_log
for insert to authenticated with check (auth.uid() is not null);

-- settings
create policy "settings_select_admin" on public.settings
for select to authenticated using (public.is_app_admin());

create policy "settings_write_admin" on public.settings
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

-- Auto-membership when a project is created by an owner_id.
create or replace function public.add_owner_project_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.project_members (project_id, user_id, access_role)
    values (new.id, new.owner_id, 'owner')
    on conflict (project_id, user_id) do update set access_role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_add_owner_project_member on public.projects;
create trigger trg_add_owner_project_member
after insert or update of owner_id on public.projects
for each row execute function public.add_owner_project_member();



-- =====================================================================
-- Source: migration_v3b_fix_member_policies.sql
-- =====================================================================

-- Project Tracker Workspace v3b: safe project_members RLS patch
-- Run after supabase/migration_v3_auth_permissions.sql.
-- This avoids self-referential project_members policies.

create or replace function public.can_manage_project_members(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_app_admin()
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = public.current_app_user_id()
        and pm.access_role = 'owner'
    );
$$;

grant execute on function public.can_manage_project_members(uuid) to authenticated;

drop policy if exists "project_members_select_visible" on public.project_members;
drop policy if exists "project_members_insert_admin_or_owner" on public.project_members;
drop policy if exists "project_members_update_admin_or_owner" on public.project_members;
drop policy if exists "project_members_delete_admin_or_owner" on public.project_members;

create policy "project_members_select_visible" on public.project_members
for select to authenticated
using (
  public.is_app_admin()
  or user_id = public.current_app_user_id()
  or public.can_view_project(project_id)
);

create policy "project_members_insert_admin_or_owner" on public.project_members
for insert to authenticated
with check (public.can_manage_project_members(project_id));

create policy "project_members_update_admin_or_owner" on public.project_members
for update to authenticated
using (public.can_manage_project_members(project_id))
with check (public.can_manage_project_members(project_id));

create policy "project_members_delete_admin_or_owner" on public.project_members
for delete to authenticated
using (public.can_manage_project_members(project_id));



-- =====================================================================
-- Source: migration_v4_collaboration.sql
-- =====================================================================

-- Project Tracker Workspace v4: multiple assignees, project participants, chats, files
-- Run after v3/v3b migrations.

create extension if not exists pgcrypto;

-- Multiple task assignees.
create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(task_id, user_id)
);

create index if not exists idx_task_assignees_task_id on public.task_assignees(task_id);
create index if not exists idx_task_assignees_user_id on public.task_assignees(user_id);

-- Project chat messages. Access is inherited from project visibility.
create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.app_users(id) on delete set null,
  body text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_project_messages_project_id on public.project_messages(project_id);
create index if not exists idx_project_messages_author_id on public.project_messages(author_id);
create index if not exists idx_project_messages_created_at on public.project_messages(created_at);

-- Optional chat read state for future unread counters.
create table if not exists public.project_message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.project_messages(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(message_id, user_id)
);

create index if not exists idx_project_message_reads_message_id on public.project_message_reads(message_id);
create index if not exists idx_project_message_reads_user_id on public.project_message_reads(user_id);

-- Updated-at trigger for messages.
drop trigger if exists trg_project_messages_updated_at on public.project_messages;
create trigger trg_project_messages_updated_at
before update on public.project_messages
for each row execute function public.set_updated_at();

alter table public.task_assignees enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_message_reads enable row level security;

-- Make migration rerunnable.
drop policy if exists "task_assignees_select_visible_project" on public.task_assignees;
drop policy if exists "task_assignees_insert_project_editors" on public.task_assignees;
drop policy if exists "task_assignees_update_project_editors" on public.task_assignees;
drop policy if exists "task_assignees_delete_project_editors" on public.task_assignees;

drop policy if exists "project_messages_select_visible_project" on public.project_messages;
drop policy if exists "project_messages_insert_visible_project" on public.project_messages;
drop policy if exists "project_messages_update_author_or_editor" on public.project_messages;
drop policy if exists "project_messages_delete_author_or_editor" on public.project_messages;

drop policy if exists "project_message_reads_select_self" on public.project_message_reads;
drop policy if exists "project_message_reads_insert_self" on public.project_message_reads;
drop policy if exists "project_message_reads_update_self" on public.project_message_reads;
drop policy if exists "project_message_reads_delete_self" on public.project_message_reads;

create policy "task_assignees_select_visible_project" on public.task_assignees
for select to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_view_project(t.project_id)
  )
);

create policy "task_assignees_insert_project_editors" on public.task_assignees
for insert to authenticated
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_edit_project(t.project_id)
  )
);

create policy "task_assignees_update_project_editors" on public.task_assignees
for update to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_edit_project(t.project_id)
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_edit_project(t.project_id)
  )
);

create policy "task_assignees_delete_project_editors" on public.task_assignees
for delete to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_assignees.task_id
      and public.can_edit_project(t.project_id)
  )
);

create policy "project_messages_select_visible_project" on public.project_messages
for select to authenticated
using (deleted_at is null and public.can_view_project(project_id));

create policy "project_messages_insert_visible_project" on public.project_messages
for insert to authenticated
with check (public.can_view_project(project_id) and author_id = public.current_app_user_id());

create policy "project_messages_update_author_or_editor" on public.project_messages
for update to authenticated
using (author_id = public.current_app_user_id() or public.can_edit_project(project_id))
with check (author_id = public.current_app_user_id() or public.can_edit_project(project_id));

create policy "project_messages_delete_author_or_editor" on public.project_messages
for delete to authenticated
using (author_id = public.current_app_user_id() or public.can_edit_project(project_id));

create policy "project_message_reads_select_self" on public.project_message_reads
for select to authenticated using (user_id = public.current_app_user_id());

create policy "project_message_reads_insert_self" on public.project_message_reads
for insert to authenticated with check (user_id = public.current_app_user_id());

create policy "project_message_reads_update_self" on public.project_message_reads
for update to authenticated using (user_id = public.current_app_user_id()) with check (user_id = public.current_app_user_id());

create policy "project_message_reads_delete_self" on public.project_message_reads
for delete to authenticated using (user_id = public.current_app_user_id());

-- Backfill task_assignees from legacy tasks.assignee_id.
insert into public.task_assignees (task_id, user_id)
select id, assignee_id
from public.tasks
where assignee_id is not null
on conflict (task_id, user_id) do nothing;

-- Storage bucket for chat attachments.
insert into storage.buckets (id, name, public)
values ('project-chat-files', 'project-chat-files', false)
on conflict (id) do nothing;

-- Storage policies. Files are stored as <project_id>/<message_id-or-random>/<filename>.
drop policy if exists "project_chat_files_select" on storage.objects;
drop policy if exists "project_chat_files_insert" on storage.objects;
drop policy if exists "project_chat_files_update" on storage.objects;
drop policy if exists "project_chat_files_delete" on storage.objects;

create policy "project_chat_files_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'project-chat-files'
  and public.can_view_project(((storage.foldername(name))[1])::uuid)
);

create policy "project_chat_files_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'project-chat-files'
  and public.can_view_project(((storage.foldername(name))[1])::uuid)
);

create policy "project_chat_files_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'project-chat-files'
  and public.can_edit_project(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'project-chat-files'
  and public.can_edit_project(((storage.foldername(name))[1])::uuid)
);

create policy "project_chat_files_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'project-chat-files'
  and public.can_edit_project(((storage.foldername(name))[1])::uuid)
);



-- =====================================================================
-- Source: migration_v5_soft_delete_tasks.sql
-- =====================================================================

-- Project Tracker Workspace v5: secure task soft-delete RPC
-- Run after v3/v4 migrations.

create or replace function public.soft_delete_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id
    and deleted_at is null;

  if v_task.id is null then
    raise exception 'Task not found';
  end if;

  if not public.can_edit_project(v_task.project_id) then
    raise exception 'No permission to delete this task';
  end if;

  update public.tasks
  set deleted_at = now(),
      updated_at = now()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

grant execute on function public.soft_delete_task(uuid) to authenticated;



-- =====================================================================
-- Source: v16_fix_projects_rls_update_delete.sql
-- =====================================================================

-- v16_fix_projects_rls_update_delete.sql
-- Run in Supabase SQL Editor.
-- Fixes project update/delete permissions, audit logging, and task subtasks.

alter table public.projects enable row level security;

drop policy if exists projects_select_visible on public.projects;
drop policy if exists projects_insert_authenticated on public.projects;
drop policy if exists projects_update_owner_editor_admin on public.projects;
drop policy if exists projects_delete_owner_admin on public.projects;
drop policy if exists projects_update_authenticated on public.projects;

create policy projects_select_visible
on public.projects
for select
to authenticated
using (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = projects.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = projects.id and pm.user_id = au.id
        )
      )
  )
);

create policy projects_insert_authenticated
on public.projects
for insert
to authenticated
with check (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (au.role in ('owner','admin') or au.id = owner_id)
  )
);

create policy projects_update_owner_editor_admin
on public.projects
for update
to authenticated
using (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = projects.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = projects.id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
)
with check (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = projects.id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
);

create policy projects_delete_owner_admin
on public.projects
for delete
to authenticated
using (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = projects.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = projects.id
            and pm.user_id = au.id
            and pm.access_role = 'owner'
        )
      )
  )
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_select_authenticated on public.activity_log;
create policy activity_log_select_authenticated
on public.activity_log
for select
to authenticated
using (true);

drop policy if exists activity_log_insert_authenticated on public.activity_log;
create policy activity_log_insert_authenticated
on public.activity_log
for insert
to authenticated
with check (true);

create or replace function public.audit_actor_json()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'app_user_id', au.id,
        'display_name', au.display_name,
        'email', au.email,
        'role', au.role,
        'auth_user_id', au.auth_user_id
      )
      from public.app_users au
      where au.auth_user_id = auth.uid()
      limit 1
    ),
    jsonb_build_object('auth_user_id', auth.uid(), 'display_name', 'unknown')
  )
$$;

create or replace function public.audit_task_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_changes jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('task', NEW.id, 'create', jsonb_build_object(
      'actor', public.audit_actor_json(),
      'task_title', NEW.title,
      'project_id', NEW.project_id,
      'new_status', NEW.status,
      'new', to_jsonb(NEW)
    ));
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.status is distinct from NEW.status then
      v_action := 'task_status_change';
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
    else
      v_action := 'update';
    end if;

    if OLD.title is distinct from NEW.title then
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('from', OLD.title, 'to', NEW.title));
    end if;
    if OLD.priority is distinct from NEW.priority then
      v_changes := v_changes || jsonb_build_object('priority', jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
    end if;
    if OLD.assignee_id is distinct from NEW.assignee_id then
      v_changes := v_changes || jsonb_build_object('assignee_id', jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id));
    end if;
    if OLD.start_date is distinct from NEW.start_date then
      v_changes := v_changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date));
    end if;
    if OLD.due_date is distinct from NEW.due_date then
      v_changes := v_changes || jsonb_build_object('due_date', jsonb_build_object('from', OLD.due_date, 'to', NEW.due_date));
    end if;
    if OLD.project_id is distinct from NEW.project_id then
      v_changes := v_changes || jsonb_build_object('project_id', jsonb_build_object('from', OLD.project_id, 'to', NEW.project_id));
    end if;

    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('task', NEW.id, v_action, jsonb_build_object(
      'actor', public.audit_actor_json(),
      'task_title', NEW.title,
      'project_id', NEW.project_id,
      'changes', v_changes,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ));
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('task', OLD.id, 'delete', jsonb_build_object(
      'actor', public.audit_actor_json(),
      'task_title', OLD.title,
      'project_id', OLD.project_id,
      'old', to_jsonb(OLD)
    ));
    return OLD;
  end if;

  return null;
end;
$$;

create or replace function public.audit_project_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_changes jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('project', NEW.id, 'create', jsonb_build_object(
      'actor', public.audit_actor_json(),
      'project_name', NEW.name,
      'new_status', NEW.status,
      'new', to_jsonb(NEW)
    ));
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.status is distinct from NEW.status then
      v_action := 'project_status_change';
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
    else
      v_action := 'update';
    end if;

    if OLD.name is distinct from NEW.name then
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', OLD.name, 'to', NEW.name));
    end if;
    if OLD.priority is distinct from NEW.priority then
      v_changes := v_changes || jsonb_build_object('priority', jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
    end if;
    if OLD.owner_id is distinct from NEW.owner_id then
      v_changes := v_changes || jsonb_build_object('owner_id', jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id));
    end if;
    if OLD.start_date is distinct from NEW.start_date then
      v_changes := v_changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date));
    end if;
    if OLD.deadline is distinct from NEW.deadline then
      v_changes := v_changes || jsonb_build_object('deadline', jsonb_build_object('from', OLD.deadline, 'to', NEW.deadline));
    end if;

    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('project', NEW.id, v_action, jsonb_build_object(
      'actor', public.audit_actor_json(),
      'project_name', NEW.name,
      'changes', v_changes,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ));
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('project', OLD.id, 'delete', jsonb_build_object(
      'actor', public.audit_actor_json(),
      'project_name', OLD.name,
      'old', to_jsonb(OLD)
    ));
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_audit_tasks_changes on public.tasks;
create trigger trg_audit_tasks_changes
after insert or update or delete on public.tasks
for each row execute function public.audit_task_changes();

drop trigger if exists trg_audit_projects_changes on public.projects;
create trigger trg_audit_projects_changes
after insert or update or delete on public.projects
for each row execute function public.audit_project_changes();

-- Task subtasks: atomic checklist items inside a task.
create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.app_users(id) on delete set null,
  completed_by uuid references public.app_users(id) on delete set null,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_subtasks_task_id on public.task_subtasks(task_id);
create index if not exists idx_task_subtasks_visible on public.task_subtasks(task_id, deleted_at, sort_order);

alter table public.task_subtasks enable row level security;

drop policy if exists task_subtasks_select_visible on public.task_subtasks;
create policy task_subtasks_select_visible
on public.task_subtasks
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    join public.app_users au on au.auth_user_id = auth.uid()
    where t.id = task_subtasks.task_id
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = p.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = au.id
        )
      )
  )
);

drop policy if exists task_subtasks_insert_editor on public.task_subtasks;
create policy task_subtasks_insert_editor
on public.task_subtasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    join public.app_users au on au.auth_user_id = auth.uid()
    where t.id = task_subtasks.task_id
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = p.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
);

drop policy if exists task_subtasks_update_editor on public.task_subtasks;
create policy task_subtasks_update_editor
on public.task_subtasks
for update
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    join public.app_users au on au.auth_user_id = auth.uid()
    where t.id = task_subtasks.task_id
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = p.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    join public.app_users au on au.auth_user_id = auth.uid()
    where t.id = task_subtasks.task_id
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = p.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
);

drop policy if exists task_subtasks_delete_editor on public.task_subtasks;
create policy task_subtasks_delete_editor
on public.task_subtasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    join public.app_users au on au.auth_user_id = auth.uid()
    where t.id = task_subtasks.task_id
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or au.id = p.owner_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
);

create or replace function public.touch_task_subtasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_touch_task_subtasks_updated_at on public.task_subtasks;
create trigger trg_touch_task_subtasks_updated_at
before update on public.task_subtasks
for each row execute function public.touch_task_subtasks_updated_at();

create or replace function public.audit_task_subtask_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('task', NEW.task_id, 'subtask_create', jsonb_build_object(
      'actor', public.audit_actor_json(),
      'subtask_id', NEW.id,
      'title', NEW.title,
      'new', to_jsonb(NEW)
    ));
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      v_action := 'subtask_delete';
    elsif OLD.is_done is distinct from NEW.is_done then
      v_action := case when NEW.is_done then 'subtask_done' else 'subtask_reopen' end;
    else
      v_action := 'subtask_update';
    end if;

    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('task', NEW.task_id, v_action, jsonb_build_object(
      'actor', public.audit_actor_json(),
      'subtask_id', NEW.id,
      'title', NEW.title,
      'old_done', OLD.is_done,
      'new_done', NEW.is_done,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ));
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into public.activity_log(entity_type, entity_id, action, payload)
    values ('task', OLD.task_id, 'subtask_delete', jsonb_build_object(
      'actor', public.audit_actor_json(),
      'subtask_id', OLD.id,
      'title', OLD.title,
      'old', to_jsonb(OLD)
    ));
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_audit_task_subtasks_changes on public.task_subtasks;
create trigger trg_audit_task_subtasks_changes
after insert or update or delete on public.task_subtasks
for each row execute function public.audit_task_subtask_changes();



-- =====================================================================
-- Source: v19_fix_project_messages_rls.sql
-- =====================================================================

-- v19_fix_project_messages_rls.sql
-- Run in Supabase SQL Editor.
-- Fixes: new row violates row-level security policy for table "project_messages"
-- when owner/admin/project owner deletes messages or clears chat.

alter table public.project_messages enable row level security;

drop policy if exists project_messages_select_visible on public.project_messages;
drop policy if exists project_messages_insert_visible on public.project_messages;
drop policy if exists project_messages_update_owner_admin on public.project_messages;
drop policy if exists project_messages_delete_owner_admin on public.project_messages;
drop policy if exists project_messages_select_authenticated on public.project_messages;
drop policy if exists project_messages_insert_authenticated on public.project_messages;
drop policy if exists project_messages_update_authenticated on public.project_messages;
drop policy if exists project_messages_delete_authenticated on public.project_messages;

create policy project_messages_select_visible
on public.project_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or exists (
          select 1 from public.projects p
          where p.id = project_messages.project_id
            and p.owner_id = au.id
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = project_messages.project_id
            and pm.user_id = au.id
        )
      )
  )
);

create policy project_messages_insert_visible
on public.project_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or exists (
          select 1 from public.projects p
          where p.id = project_id
            and p.owner_id = au.id
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = project_id
            and pm.user_id = au.id
        )
      )
  )
);

-- Needed if frontend uses soft-delete/update for deleting messages.
create policy project_messages_update_owner_admin
on public.project_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or exists (
          select 1 from public.projects p
          where p.id = project_messages.project_id
            and p.owner_id = au.id
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = project_messages.project_id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or exists (
          select 1 from public.projects p
          where p.id = project_id
            and p.owner_id = au.id
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = project_id
            and pm.user_id = au.id
            and pm.access_role in ('owner','editor')
        )
      )
  )
);

create policy project_messages_delete_owner_admin
on public.project_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or exists (
          select 1 from public.projects p
          where p.id = project_messages.project_id
            and p.owner_id = au.id
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = project_messages.project_id
            and pm.user_id = au.id
            and pm.access_role = 'owner'
        )
      )
  )
);



-- =====================================================================
-- Source: v19_presence_owner.sql
-- =====================================================================

-- v19_presence_owner.sql
-- Run in Supabase SQL Editor.

create table if not exists public.user_presence (
  session_id text primary key,
  user_id uuid,
  auth_user_id uuid,
  display_name text,
  role text,
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  page text
);

alter table public.user_presence enable row level security;

drop policy if exists user_presence_select_owner on public.user_presence;
create policy user_presence_select_owner
on public.user_presence
for select
to authenticated
using (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role = 'owner'
  )
);

drop policy if exists user_presence_insert_own on public.user_presence;
create policy user_presence_insert_own
on public.user_presence
for insert
to authenticated
with check (auth_user_id = auth.uid());

drop policy if exists user_presence_update_own on public.user_presence;
create policy user_presence_update_own
on public.user_presence
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());
