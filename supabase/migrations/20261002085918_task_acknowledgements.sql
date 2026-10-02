-- Manual, per-assignee acknowledgement. Never changes completion or task status.
begin;

alter table public.tasks add column assignee_revision uuid not null default gen_random_uuid();

create function public.set_task_assignee_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id then
    new.assignee_revision := gen_random_uuid();
  else
    new.assignee_revision := old.assignee_revision;
  end if;
  return new;
end;
$$;
revoke all on function public.set_task_assignee_revision() from public, anon, authenticated;
create trigger task_assignee_revision before insert or update on public.tasks
for each row execute function public.set_task_assignee_revision();

create table public.task_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  assignment_id uuid references public.task_assignees(id) on delete cascade,
  assignment_token uuid not null,
  acknowledged_at timestamptz not null default now(),
  unique (task_id, user_id, assignment_token)
);
create index task_acknowledgements_user_idx on public.task_acknowledgements(user_id);
create index task_acknowledgements_assignment_idx on public.task_acknowledgements(assignment_id);
alter table public.task_acknowledgements enable row level security;
revoke all on public.task_acknowledgements from public, anon, authenticated;
grant select on public.task_acknowledgements to authenticated;
-- Clients cannot forge the server timestamp or modify somebody else's receipt.
grant insert (task_id, user_id, assignment_id, assignment_token)
on public.task_acknowledgements to authenticated;

create policy task_acknowledgements_visible on public.task_acknowledgements
for select to authenticated using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and t.deleted_at is null
      and public.can_view_project(t.project_id)
      and (
        exists (select 1 from public.task_assignees a
          where a.id = assignment_id and a.id = assignment_token
            and a.task_id = t.id and a.user_id = task_acknowledgements.user_id)
        or (assignment_id is null and t.assignee_id = user_id
          and t.assignee_revision = assignment_token
          and not exists (select 1 from public.task_assignees a
            where a.task_id = t.id and a.user_id = task_acknowledgements.user_id))
      )
  )
);
create policy task_acknowledgements_self_insert on public.task_acknowledgements
for insert to authenticated with check (
  user_id = (select public.current_app_user_id())
  and exists (select 1 from public.app_users u
    where u.id = user_id and u.is_active and u.auth_user_id = (select auth.uid()))
  and exists (
    select 1 from public.tasks t where t.id = task_id and t.deleted_at is null
      and public.can_view_project(t.project_id)
      and (
        exists (select 1 from public.task_assignees a
          where a.id = assignment_id and a.id = assignment_token
            and a.task_id = t.id and a.user_id = task_acknowledgements.user_id)
        or (assignment_id is null and t.assignee_id = user_id
          and t.assignee_revision = assignment_token
          and not exists (select 1 from public.task_assignees a
            where a.task_id = t.id and a.user_id = task_acknowledgements.user_id))
      )
  )
);

create function public.acknowledge_task(p_task uuid)
returns public.task_acknowledgements
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := public.current_app_user_id();
  t public.tasks;
  a uuid;
  token uuid;
  receipt public.task_acknowledgements;
begin
  if auth.uid() is null or not exists (select 1 from public.app_users u
    where u.id = me and u.is_active and u.auth_user_id = auth.uid()) then
    raise exception 'Active authenticated profile required' using errcode = '42501';
  end if;
  select * into t from public.tasks where id = p_task and deleted_at is null;
  if not found then raise exception 'Task not available' using errcode = '42501'; end if;
  select id into a from public.task_assignees
    where task_id = p_task and user_id = me;
  if a is null and t.assignee_id is distinct from me then
    raise exception 'Only an assigned user can acknowledge a task' using errcode = '42501';
  end if;
  token := coalesce(a, t.assignee_revision);
  insert into public.task_acknowledgements(task_id,user_id,assignment_id,assignment_token)
    values (p_task,me,a,token)
    on conflict (task_id,user_id,assignment_token) do nothing;
  select * into receipt from public.task_acknowledgements
    where task_id = p_task and user_id = me and assignment_token = token;
  return receipt;
end;
$$;
revoke all on function public.acknowledge_task(uuid) from public, anon;
grant execute on function public.acknowledge_task(uuid) to authenticated;

-- Atomic assignment diff: ordinary edits retain assignment IDs and receipts.
create function public.sync_task_assignees(p_task uuid, p_users uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare t public.tasks;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into t from public.tasks where id = p_task and deleted_at is null for update;
  if not found or not public.can_edit_project(t.project_id) then
    raise exception 'Task editing permission required' using errcode = '42501';
  end if;
  p_users := coalesce(p_users, '{}'::uuid[]);
  if array_position(p_users, null) is not null then raise exception 'Invalid assignee'; end if;
  delete from public.task_assignees where task_id = p_task and not (user_id = any(p_users));
  insert into public.task_assignees(task_id,user_id)
    select p_task, u from (select distinct unnest(p_users) as u) selected
    on conflict (task_id,user_id) do nothing;
end;
$$;
revoke all on function public.sync_task_assignees(uuid,uuid[]) from public, anon;
grant execute on function public.sync_task_assignees(uuid,uuid[]) to authenticated;

alter table public.task_acknowledgements replica identity full;
do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.task_acknowledgements;
  end if;
end $$;
commit;
