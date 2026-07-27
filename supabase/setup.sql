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
set search_pat…6629 tokens truncated…'task_status_change';
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

-- Save subtask rank changes as one transaction while preserving caller RLS.
create or replace function public.reorder_task_subtasks(
  p_task_id uuid,
  p_updates jsonb
)
returns table (
  id uuid,
  sort_order integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_requested_count integer;
  v_valid_count integer;
  v_distinct_id_count integer;
  v_updated_count integer;
begin
  if p_task_id is null then
    raise exception 'task id is required' using errcode = '22023';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception 'updates must be a JSON array' using errcode = '22023';
  end if;

  v_requested_count := jsonb_array_length(p_updates);
  if v_requested_count < 1 then
    raise exception 'at least one rank update is required' using errcode = '22023';
  end if;

  select count(*), count(distinct item.id)
    into v_valid_count, v_distinct_id_count
  from jsonb_to_recordset(p_updates) as item(id uuid, sort_order integer)
  where item.id is not null
    and item.sort_order is not null;

  if v_valid_count <> v_requested_count
     or v_distinct_id_count <> v_requested_count then
    raise exception 'each update must contain a unique id and integer sort_order'
      using errcode = '22023';
  end if;

  return query
  with requested as (
    select item.id, item.sort_order
    from jsonb_to_recordset(p_updates) as item(id uuid, sort_order integer)
  )
  update public.task_subtasks as subtask
     set sort_order = requested.sort_order
    from requested
   where subtask.id = requested.id
     and subtask.task_id = p_task_id
     and subtask.deleted_at is null
  returning subtask.id, subtask.sort_order;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_requested_count then
    raise exception 'one or more subtasks could not be reordered'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.reorder_task_subtasks(uuid, jsonb) from public;
revoke all on function public.reorder_task_subtasks(uuid, jsonb) from anon;
grant execute on function public.reorder_task_subtasks(uuid, jsonb) to authenticated;

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

