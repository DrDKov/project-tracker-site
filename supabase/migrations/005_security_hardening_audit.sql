-- Stage 28: Supabase security hardening and audit baseline.
-- Safe to run after supabase/setup.sql. Idempotent. Does not drop data.
-- Purpose: remove historical permissive anon policies, keep buckets private,
-- and expose a DBA-readable security baseline report.

-- ---------------------------------------------------------------------
-- 1. Protected workspace tables must have RLS enabled.
-- ---------------------------------------------------------------------
alter table if exists public.app_users enable row level security;
alter table if exists public.projects enable row level security;
alter table if exists public.project_members enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.task_assignees enable row level security;
alter table if exists public.task_subtasks enable row level security;
alter table if exists public.task_comments enable row level security;
alter table if exists public.task_recurrence_rules enable row level security;
alter table if exists public.project_messages enable row level security;
alter table if exists public.project_message_reads enable row level security;
alter table if exists public.workspace_templates enable row level security;
alter table if exists public.material_folders enable row level security;
alter table if exists public.material_files enable row level security;
alter table if exists public.activity_log enable row level security;
alter table if exists public.settings enable row level security;
alter table if exists public.user_presence enable row level security;

-- ---------------------------------------------------------------------
-- 2. Drop historical MVP/v2 anon policies. These may exist in old databases.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 3. Defensive grants. Authenticated role can reach tables, RLS decides rows.
--    Anon must not have workspace table access.
-- ---------------------------------------------------------------------
revoke all on table
  public.app_users,
  public.projects,
  public.project_members,
  public.tasks,
  public.task_assignees,
  public.task_subtasks,
  public.task_comments,
  public.task_recurrence_rules,
  public.project_messages,
  public.project_message_reads,
  public.workspace_templates,
  public.material_folders,
  public.material_files,
  public.activity_log,
  public.settings,
  public.user_presence
from anon;

grant select, insert, update, delete on table
  public.app_users,
  public.projects,
  public.project_members,
  public.tasks,
  public.task_assignees,
  public.task_subtasks,
  public.task_comments,
  public.task_recurrence_rules,
  public.project_messages,
  public.project_message_reads,
  public.workspace_templates,
  public.material_folders,
  public.material_files,
  public.activity_log,
  public.settings,
  public.user_presence
 to authenticated;

-- ---------------------------------------------------------------------
-- 4. Storage buckets must remain private. Access is via Storage RLS/signed URLs.
-- ---------------------------------------------------------------------
update storage.buckets
set public = false
where id in ('project-chat-files', 'workspace-materials');

-- ---------------------------------------------------------------------
-- 5. DBA-readable baseline report for live Supabase verification.
-- ---------------------------------------------------------------------
create or replace function public.workspace_security_baseline_report()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
stable
as $$
  select jsonb_build_object(
    'checked_at', now(),
    'anon_public_table_policies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'schemaname', p.schemaname,
        'tablename', p.tablename,
        'policyname', p.policyname,
        'cmd', p.cmd,
        'roles', p.roles,
        'qual', p.qual,
        'with_check', p.with_check
      ) order by p.tablename, p.policyname)
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in (
          'app_users','projects','project_members','tasks','task_assignees','task_subtasks','task_comments',
          'task_recurrence_rules','project_messages','project_message_reads','workspace_templates',
          'material_folders','material_files','activity_log','settings','user_presence'
        )
        and 'anon' = any(p.roles)
    ), '[]'::jsonb),
    'public_workspace_buckets', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'public', b.public) order by b.id)
      from storage.buckets b
      where b.id in ('project-chat-files', 'workspace-materials')
        and b.public is true
    ), '[]'::jsonb),
    'rls_disabled_tables', coalesce((
      select jsonb_agg(c.relname order by c.relname)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'app_users','projects','project_members','tasks','task_assignees','task_subtasks','task_comments',
          'task_recurrence_rules','project_messages','project_message_reads','workspace_templates',
          'material_folders','material_files','activity_log','settings','user_presence'
        )
        and c.relrowsecurity is false
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.workspace_security_baseline_report() to authenticated;
