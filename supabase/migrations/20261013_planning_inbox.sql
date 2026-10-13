-- Workspace planning inbox: unscheduled drafts are not normal tasks until promoted.
create table if not exists public.planning_inbox (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(btrim(title)) between 1 and 500),
 notes text,
 project_id uuid references public.projects(id) on delete restrict,
 assignee_id uuid references public.app_users(id) on delete set null,
 created_by uuid not null default public.current_app_user_id() references public.app_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint planning_inbox_assignment_requires_project check (assignee_id is null or project_id is not null)
);
create index if not exists planning_inbox_project_idx on public.planning_inbox(project_id,created_at);
create index if not exists planning_inbox_creator_idx on public.planning_inbox(created_by,created_at);
alter table public.planning_inbox enable row level security;
revoke all on table public.planning_inbox from public,anon;
grant select,insert,update,delete on table public.planning_inbox to authenticated;

drop policy if exists planning_inbox_select on public.planning_inbox;
create policy planning_inbox_select on public.planning_inbox for select to authenticated
using (
 created_by=public.current_app_user_id() or public.is_app_admin()
 or (project_id is not null and public.can_view_project(project_id))
);
drop policy if exists planning_inbox_insert on public.planning_inbox;
create policy planning_inbox_insert on public.planning_inbox for insert to authenticated
with check (
 created_by=public.current_app_user_id() and
 (project_id is null or public.can_edit_project(project_id))
);
drop policy if exists planning_inbox_update on public.planning_inbox;
create policy planning_inbox_update on public.planning_inbox for update to authenticated
using (
 public.is_app_admin() or
 (project_id is null and created_by=public.current_app_user_id()) or
 (project_id is not null and public.can_edit_project(project_id))
)
with check (
 public.is_app_admin() or
 (project_id is null and created_by=public.current_app_user_id()) or
 (project_id is not null and public.can_edit_project(project_id))
);
drop policy if exists planning_inbox_delete on public.planning_inbox;
create policy planning_inbox_delete on public.planning_inbox for delete to authenticated
using (
 public.is_app_admin() or
 (project_id is null and created_by=public.current_app_user_id()) or
 (project_id is not null and public.can_edit_project(project_id))
);

-- Server-side validation blocks foreign-project assignees even for crafted REST requests.
create or replace function public.validate_planning_inbox()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.created_by is distinct from old.created_by then
  raise exception 'Cannot change planning item creator';
 end if;
 if new.assignee_id is not null then
  if new.project_id is null then
   raise exception 'Choose a project before assigning an executor';
  end if;
  if not exists (
   select 1 from public.app_users u
   join public.projects p on p.id=new.project_id and p.deleted_at is null
   where u.id=new.assignee_id and u.is_active
    and (u.role in ('owner','admin') or p.owner_id=u.id
         or exists(select 1 from public.project_members pm
                   where pm.project_id=p.id and pm.user_id=u.id))
  ) then
   raise exception 'Executor has no access to this project';
  end if;
 end if;
 new.updated_at=now();
 return new;
end
$$;
revoke all on function public.validate_planning_inbox() from public,anon,authenticated;
drop trigger if exists trg_validate_planning_inbox on public.planning_inbox;
create trigger trg_validate_planning_inbox before insert or update on public.planning_inbox
 for each row execute function public.validate_planning_inbox();

-- Atomic promotion prevents creating a normal task without removing the corresponding draft.
create or replace function public.schedule_planning_item(p_item_id uuid,p_date date)
returns public.tasks
language plpgsql security invoker set search_path='' as $$
declare
 v_item public.planning_inbox%rowtype;
 v_task public.tasks%rowtype;
begin
 if p_date is null then raise exception 'Choose a date'; end if;
 select * into v_item from public.planning_inbox where id=p_item_id for update;
 if not found then raise exception 'Planning item unavailable'; end if;
 if v_item.project_id is null then raise exception 'Choose a project first'; end if;
 if not public.can_edit_project(v_item.project_id) then raise exception 'No permission to schedule this project'; end if;
 insert into public.tasks(project_id,title,notes,status,priority,start_date,due_date,assignee_id)
 values(v_item.project_id,v_item.title,v_item.notes,'planned','medium',p_date,p_date,v_item.assignee_id)
 returning * into v_task;
 if v_item.assignee_id is not null then
  insert into public.task_assignees(task_id,user_id) values(v_task.id,v_item.assignee_id);
 end if;
 delete from public.planning_inbox where id=p_item_id;
 if not found then raise exception 'Failed to close planning item'; end if;
 return v_task;
end
$$;
revoke all on function public.schedule_planning_item(uuid,date) from public,anon;
grant execute on function public.schedule_planning_item(uuid,date) to authenticated;
