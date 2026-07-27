-- Atomically persist one or more subtask rank changes.
-- The function runs with the caller's permissions, so task_subtasks RLS remains
-- the source of truth for who may reorder a task.

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

