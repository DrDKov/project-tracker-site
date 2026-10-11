-- Short-lived server receipts. Clients cannot supply an arbitrary "old" value.
create table private.workspace_undo_receipts (
  token uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  entity text not null check(entity in ('tasks','task_subtasks')),
  entity_id uuid not null,
  task_id uuid not null,
  before_patch jsonb not null,
  after_row jsonb not null,
  completion_only boolean not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default clock_timestamp()+interval '2 minutes',
  consumed_at timestamptz
);
alter table private.workspace_undo_receipts enable row level security;
revoke all on private.workspace_undo_receipts from public,anon,authenticated;
create index workspace_undo_lookup on private.workspace_undo_receipts(auth_user_id,entity,entity_id,created_at desc);

create or replace function private.capture_workspace_undo()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=(select auth.uid()); v_before jsonb:=to_jsonb(old); v_after jsonb:=to_jsonb(new);
  v_patch jsonb; v_changed text[]; v_allowed text[]; v_completion text[]; v_task uuid;
begin
  if v_uid is null or current_setting('pt.undo_running',true)='yes' then return new; end if;
  if not exists(select 1 from public.app_users where auth_user_id=v_uid and is_active) then return new; end if;
  if tg_table_name='tasks' then
    v_allowed:=array['status','start_date','due_date','start_time','end_time','duration_minutes','is_all_day','completed_at','completed_by_id','deleted_at','sort_order'];
    v_completion:=array['status','completed_at','completed_by_id']; v_task:=new.id;
  else
    v_allowed:=array['completion_state','is_done','completed_at','completed_by','deleted_at','sort_order'];
    v_completion:=array['completion_state','is_done','completed_at','completed_by']; v_task:=new.task_id;
  end if;
  select array_agg(key),jsonb_object_agg(key,value) into v_changed,v_patch from jsonb_each(v_before)
    where key<>'updated_at' and value is distinct from v_after->key;
  if v_changed is null or not v_changed<@v_allowed then return new; end if;
  insert into private.workspace_undo_receipts(auth_user_id,entity,entity_id,task_id,before_patch,after_row,completion_only)
    values(v_uid,tg_table_name,new.id,v_task,v_patch,v_after,v_changed<@v_completion);
  -- Bounded per-user retention without touching any working task or comment.
  delete from private.workspace_undo_receipts where auth_user_id=v_uid and expires_at<clock_timestamp()-interval '1 day';
  return new;
end;
$$;
revoke all on function private.capture_workspace_undo() from public,anon,authenticated;
create trigger task_undo_receipt after update on public.tasks for each row execute function private.capture_workspace_undo();
create trigger subtask_undo_receipt after update on public.task_subtasks for each row execute function private.capture_workspace_undo();

create or replace function private.find_workspace_undo(p_table text,p_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r private.workspace_undo_receipts; u uuid;
begin
  if (select auth.uid()) is null then raise exception 'Сначала войдите' using errcode='42501'; end if;
  select id into u from public.app_users where auth_user_id=(select auth.uid()) and is_active;
  if u is null then raise exception 'Нет активного профиля' using errcode='42501'; end if;
  select * into r from private.workspace_undo_receipts
    where auth_user_id=(select auth.uid()) and entity=p_table and entity_id=p_id
      and consumed_at is null and expires_at>clock_timestamp()
    order by created_at desc limit 1;
  if r.token is null then return null; end if;
  if exists(select 1 from private.workspace_undo_receipts newer where newer.auth_user_id=r.auth_user_id and newer.created_at>r.created_at) then return null; end if;
  if not exists(select 1 from public.tasks t join public.projects p on p.id=t.project_id
    where t.id=r.task_id and p.deleted_at is null and public.can_view_project(t.project_id)) then return null; end if;
  return jsonb_build_object('token',r.token,'expires_at',r.expires_at);
end;
$$;

create or replace function private.undo_workspace_action(p_token uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r private.workspace_undo_receipts; t public.tasks; s public.task_subtasks; prior_task public.tasks; prior_sub public.task_subtasks; u uuid; patch jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Сначала войдите' using errcode='42501'; end if;
  select id into u from public.app_users where auth_user_id=(select auth.uid()) and is_active;
  if u is null then raise exception 'Нет активного профиля' using errcode='42501'; end if;
  select * into r from private.workspace_undo_receipts where token=p_token and auth_user_id=(select auth.uid());
  if r.token is null then raise exception 'Это действие нельзя отменить' using errcode='42501'; end if;
  -- Same task -> subtask lock order as the existing completion RPC.
  select tasks.* into t from public.tasks join public.projects p on p.id=tasks.project_id
    where tasks.id=r.task_id and p.deleted_at is null for update of tasks;
  if t.id is null or not public.can_view_project(t.project_id) then raise exception 'Нет доступа к задаче' using errcode='42501'; end if;
  if not public.can_edit_project(t.project_id) and not (r.completion_only and t.deleted_at is null and
    (coalesce(t.assignee_id=u,false) or exists(select 1 from public.task_assignees where task_id=t.id and user_id=u))) then
    raise exception 'Нет прав отменять это действие' using errcode='42501';
  end if;
  if r.entity='task_subtasks' then
    if t.deleted_at is not null then raise exception 'Задача удалена' using errcode='42501'; end if;
    select * into s from public.task_subtasks where id=r.entity_id and task_id=t.id for update;
  end if;
  select * into r from private.workspace_undo_receipts where token=p_token and auth_user_id=(select auth.uid()) for update;
  if r.consumed_at is not null or r.expires_at<=clock_timestamp() then raise exception 'Время отмены истекло' using errcode='22023'; end if;
  if exists(select 1 from private.workspace_undo_receipts newer where newer.auth_user_id=r.auth_user_id and newer.created_at>r.created_at) then
    raise exception 'Можно отменить только последнее действие' using errcode='22023';
  end if;
  if (r.entity='tasks' and to_jsonb(t) is distinct from r.after_row) or
    (r.entity='task_subtasks' and to_jsonb(s) is distinct from r.after_row) then
    raise exception 'Запись уже изменена. Отмена не выполнена, чтобы сохранить новые изменения.' using errcode='40001';
  end if;
  patch:=r.before_patch;
  perform set_config('pt.undo_running','yes',true);
  if r.entity='tasks' then
    prior_task:=jsonb_populate_record(t,patch);
    update public.tasks set status=prior_task.status,start_date=prior_task.start_date,due_date=prior_task.due_date,
      start_time=prior_task.start_time,end_time=prior_task.end_time,duration_minutes=prior_task.duration_minutes,is_all_day=prior_task.is_all_day,
      completed_at=prior_task.completed_at,completed_by_id=prior_task.completed_by_id,deleted_at=prior_task.deleted_at,sort_order=prior_task.sort_order
      where id=t.id returning * into t;
  else
    prior_sub:=jsonb_populate_record(s,patch);
    update public.task_subtasks set completion_state=prior_sub.completion_state,is_done=prior_sub.is_done,
      completed_at=prior_sub.completed_at,completed_by=prior_sub.completed_by,deleted_at=prior_sub.deleted_at,sort_order=prior_sub.sort_order
      where id=s.id returning * into s;
  end if;
  perform set_config('pt.undo_running','no',true);
  update private.workspace_undo_receipts set consumed_at=clock_timestamp() where token=p_token;
  return jsonb_build_object('table',r.entity,'row',case when r.entity='tasks' then to_jsonb(t) else to_jsonb(s) end);
end;
$$;
revoke all on function private.find_workspace_undo(text,uuid) from public,anon;
revoke all on function private.undo_workspace_action(uuid) from public,anon;
grant execute on function private.find_workspace_undo(text,uuid),private.undo_workspace_action(uuid) to authenticated;
create or replace function public.get_workspace_undo(p_table text,p_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.find_workspace_undo(p_table,p_id); $$;
create or replace function public.undo_workspace_action(p_token uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.undo_workspace_action(p_token); $$;
revoke all on function public.get_workspace_undo(text,uuid),public.undo_workspace_action(uuid) from public,anon;
grant execute on function public.get_workspace_undo(text,uuid),public.undo_workspace_action(uuid) to authenticated;
notify pgrst,'reload schema';
