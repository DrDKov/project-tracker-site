-- A completion-only capability for project editors and assigned viewers.
-- It does not grant task/project editing rights to viewers.
alter table public.tasks add column if not exists completed_by_id uuid
  references public.app_users(id) on delete set null;

create schema if not exists private;
revoke create on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.write_task_completion(
  p_task uuid, p_subtask uuid, p_state text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_task public.tasks;
  v_subtask public.task_subtasks;
begin
  if (select auth.uid()) is null then
    raise exception 'Сначала войдите в приложение' using errcode = '42501';
  end if;
  select u.id into v_user from public.app_users u
    where u.auth_user_id = (select auth.uid()) and u.is_active;
  if v_user is null then
    raise exception 'Активный профиль пользователя не найден' using errcode = '42501';
  end if;
  if p_subtask is not null then
    select s.task_id into p_task from public.task_subtasks s
      where s.id = p_subtask and s.deleted_at is null;
  end if;
  select t.* into v_task from public.tasks t
    join public.projects p on p.id = t.project_id and p.deleted_at is null
    where t.id = p_task and t.deleted_at is null for update of t;
  if v_task.id is null or not public.can_view_project(v_task.project_id)
    or not (public.can_edit_project(v_task.project_id)
      or coalesce(v_task.assignee_id = v_user, false)
      or exists (select 1 from public.task_assignees a
        where a.task_id = v_task.id and a.user_id = v_user)) then
    raise exception 'Нет прав изменять выполнение этой задачи' using errcode = '42501';
  end if;
  if p_subtask is null then
    if p_state is null or p_state not in ('done', 'in_progress') then
      raise exception 'Недопустимое состояние задачи' using errcode = '22023';
    end if;
    update public.tasks set status = p_state,
      completed_at = case when p_state = 'done' then
        coalesce(v_task.completed_at, pg_catalog.clock_timestamp()) else null end,
      completed_by_id = case when p_state = 'done' then
        coalesce(v_task.completed_by_id, v_user) else null end
      where id = v_task.id returning * into v_task;
    return pg_catalog.to_jsonb(v_task);
  end if;
  if p_state is null or p_state not in ('not_done', 'partial', 'done', 'attention') then
    raise exception 'Недопустимое состояние подзадачи' using errcode = '22023';
  end if;
  select s.* into v_subtask from public.task_subtasks s
    where s.id = p_subtask and s.task_id = v_task.id and s.deleted_at is null for update;
  if v_subtask.id is null then
    raise exception 'Подзадача не найдена' using errcode = '42501';
  end if;
  update public.task_subtasks set completion_state = p_state, is_done = p_state = 'done',
    completed_at = case when p_state = 'done' then
      coalesce(v_subtask.completed_at, pg_catalog.clock_timestamp()) else null end,
    completed_by = case when p_state = 'done' then
      coalesce(v_subtask.completed_by, v_user) else null end
    where id = p_subtask returning * into v_subtask;
  return pg_catalog.to_jsonb(v_subtask);
end;
$$;
revoke all on function private.write_task_completion(uuid, uuid, text) from public, anon;
grant execute on function private.write_task_completion(uuid, uuid, text) to authenticated;

create or replace function public.set_task_completion(p_task uuid, p_done boolean)
returns jsonb language sql security invoker set search_path = ''
as $$
  select private.write_task_completion(p_task, null,
    case when p_done then 'done' when not p_done then 'in_progress' else null end);
$$;
create or replace function public.set_subtask_completion(p_subtask uuid, p_state text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.write_task_completion(null, p_subtask, p_state); $$;
revoke all on function public.set_task_completion(uuid, boolean) from public, anon;
revoke all on function public.set_subtask_completion(uuid, text) from public, anon;
grant execute on function public.set_task_completion(uuid, boolean) to authenticated;
grant execute on function public.set_subtask_completion(uuid, text) to authenticated;
notify pgrst, 'reload schema';
