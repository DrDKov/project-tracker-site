-- Workspace v20260529: make task assignment visible to the assigned user.
-- Problem: task_assignees RLS is based on project visibility. If a user is assigned
-- to a task but is not a project member yet, they cannot read the assignment row,
-- so realtime/polling notifications cannot reach them.

create or replace function public.ensure_task_assignee_project_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select t.project_id into v_project_id
  from public.tasks t
  where t.id = coalesce(new.task_id, old.task_id)
    and t.deleted_at is null;

  if v_project_id is not null and new.user_id is not null then
    insert into public.project_members (project_id, user_id, access_role)
    values (v_project_id, new.user_id, 'viewer')
    on conflict (project_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_assignee_project_member on public.task_assignees;
create trigger trg_task_assignee_project_member
after insert or update of user_id, task_id on public.task_assignees
for each row execute function public.ensure_task_assignee_project_member();

create or replace function public.ensure_task_primary_assignee_project_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_id is not null and new.assignee_id is not null then
    insert into public.project_members (project_id, user_id, access_role)
    values (new.project_id, new.assignee_id, 'viewer')
    on conflict (project_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_primary_assignee_project_member on public.tasks;
create trigger trg_task_primary_assignee_project_member
after insert or update of assignee_id, project_id on public.tasks
for each row execute function public.ensure_task_primary_assignee_project_member();

-- Backfill existing assignments.
insert into public.project_members (project_id, user_id, access_role)
select distinct t.project_id, ta.user_id, 'viewer'
from public.task_assignees ta
join public.tasks t on t.id = ta.task_id
where t.deleted_at is null
  and ta.user_id is not null
on conflict (project_id, user_id) do nothing;

insert into public.project_members (project_id, user_id, access_role)
select distinct t.project_id, t.assignee_id, 'viewer'
from public.tasks t
where t.deleted_at is null
  and t.assignee_id is not null
on conflict (project_id, user_id) do nothing;
