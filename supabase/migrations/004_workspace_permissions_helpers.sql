-- Stage 4: canonical workspace permission helpers.
-- Safe to run after supabase/setup.sql. This migration does not drop existing data.
-- It centralizes the same role model used by assets/core/permissions/workspace-permissions.js.

create or replace function public.current_user_workspace_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select lower(coalesce(au.role, ''))
  from public.app_users au
  where au.id = public.current_app_user_id()
    and au.is_active = true
  limit 1;
$$;

create or replace function public.is_workspace_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_workspace_role() in ('owner','admin'), false);
$$;

create or replace function public.can_manage_workspace_users()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_workspace_admin();
$$;

create or replace function public.can_manage_workspace_materials()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_workspace_role() = 'owner', false);
$$;

create or replace function public.workspace_project_role(p_project_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when public.is_workspace_admin() then 'workspace_admin'
    when exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and p.owner_id = public.current_app_user_id()
        and p.deleted_at is null
    ) then 'owner'
    else (
      select lower(coalesce(pm.access_role, 'viewer'))
      from public.project_members pm
      join public.projects p on p.id = pm.project_id
      where pm.project_id = p_project_id
        and pm.user_id = public.current_app_user_id()
        and p.deleted_at is null
      limit 1
    )
  end;
$$;

create or replace function public.can_manage_project_members(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.workspace_project_role(p_project_id) in ('workspace_admin','owner'), false);
$$;

create or replace function public.can_write_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.workspace_project_role(p_project_id) in ('workspace_admin','owner','editor'), false);
$$;

-- Keep legacy helper names aligned with the canonical helpers.
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_workspace_admin();
$$;

create or replace function public.is_workspace_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_workspace_role() = 'owner', false);
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.workspace_project_role(p_project_id) is not null, false);
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_write_project(p_project_id);
$$;

grant execute on function public.current_user_workspace_role() to authenticated;
grant execute on function public.is_workspace_admin() to authenticated;
grant execute on function public.can_manage_workspace_users() to authenticated;
grant execute on function public.can_manage_workspace_materials() to authenticated;
grant execute on function public.workspace_project_role(uuid) to authenticated;
grant execute on function public.can_manage_project_members(uuid) to authenticated;
grant execute on function public.can_write_project(uuid) to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_workspace_owner() to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
