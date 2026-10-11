-- Every fixture and write (including audit/realtime triggers) is rolled back.
begin;
create temporary table undo_fixtures as
select u.id user_id,u.auth_user_id,p.id project_id,gen_random_uuid() task_id,gen_random_uuid() subtask_id,
  coalesce(u.role in ('owner','admin') or p.owner_id=u.id or pm.access_role in ('owner','editor'),false) editor
from public.app_users u cross join public.projects p
left join public.project_members pm on pm.user_id=u.id and pm.project_id=p.id
where u.is_active and u.auth_user_id is not null and p.deleted_at is null
  and (u.role in ('owner','admin') or p.owner_id=u.id or pm.id is not null);
grant select on undo_fixtures to authenticated;
insert into public.tasks(id,project_id,title,status,priority) select task_id,project_id,'Undo verification rollback','planned','medium' from undo_fixtures;
insert into public.task_subtasks(id,task_id,title) select subtask_id,task_id,'Undo verification rollback' from undo_fixtures;
insert into public.task_assignees(task_id,user_id) select task_id,user_id from undo_fixtures;
do $$
declare f record; receipt jsonb; result jsonb; token uuid; n integer;
begin
  for f in select * from undo_fixtures loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_user_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.set_task_completion(f.task_id,true);
    receipt:=public.get_workspace_undo('tasks',f.task_id);token:=(receipt->>'token')::uuid;
    if token is null then raise exception 'FAIL: task receipt missing'; end if;
    result:=public.undo_workspace_action(token);
    if result->'row'->>'status'<>'planned' or result->'row'->>'completed_at' is not null then raise exception 'FAIL: exact task state not restored'; end if;
    begin perform public.undo_workspace_action(token);raise exception 'FAIL: receipt reused';exception when invalid_parameter_value then null;end;
    perform public.set_subtask_completion(f.subtask_id,'partial');
    receipt:=public.get_workspace_undo('task_subtasks',f.subtask_id);
    result:=public.undo_workspace_action((receipt->>'token')::uuid);
    if result->'row'->>'completion_state'<>'not_done' then raise exception 'FAIL: subtask undo'; end if;
    begin perform count(*) from private.workspace_undo_receipts;raise exception 'FAIL: receipts exposed';exception when insufficient_privilege then null;end;
    perform public.set_task_completion(f.task_id,true);receipt:=public.get_workspace_undo('tasks',f.task_id);token:=(receipt->>'token')::uuid;
    execute 'reset role';
    perform set_config('request.jwt.claims','{}',true);
    update public.tasks set notes='Newer external edit' where id=f.task_id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_user_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.undo_workspace_action(token);raise exception 'FAIL: overwrote newer change';exception when serialization_failure then null;end;
    execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
    execute 'set local role authenticated';
    begin perform public.undo_workspace_action(token);raise exception 'FAIL: another account used receipt';exception when insufficient_privilege then null;end;
    execute 'reset role';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_user_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    perform public.set_task_completion(f.task_id,false);receipt:=public.get_workspace_undo('tasks',f.task_id);token:=(receipt->>'token')::uuid;
    execute 'reset role';update private.workspace_undo_receipts set expires_at=clock_timestamp()-interval '1 second' where workspace_undo_receipts.token=(receipt->>'token')::uuid;
    execute 'set local role authenticated';
    begin perform public.undo_workspace_action(token);raise exception 'FAIL: expired undo';exception when invalid_parameter_value then null;end;
    if f.editor then
      update public.tasks set start_date='2026-10-11',due_date='2026-10-11',start_time='10:00',end_time='11:00',duration_minutes=60 where id=f.task_id;
      receipt:=public.get_workspace_undo('tasks',f.task_id);result:=public.undo_workspace_action((receipt->>'token')::uuid);
      if result->'row'->>'start_time' is not null then raise exception 'FAIL: schedule undo'; end if;
      update public.task_subtasks set deleted_at=clock_timestamp() where id=f.subtask_id;
      receipt:=public.get_workspace_undo('task_subtasks',f.subtask_id);result:=public.undo_workspace_action((receipt->>'token')::uuid);
      if result->'row'->>'deleted_at' is not null then raise exception 'FAIL: subtask deletion undo';end if;
      perform public.soft_delete_task(f.task_id);
      receipt:=public.get_workspace_undo('tasks',f.task_id);result:=public.undo_workspace_action((receipt->>'token')::uuid);
      if result->'row'->>'deleted_at' is not null then raise exception 'FAIL: hidden task deletion undo';end if;
    else
      update public.tasks set notes='Not permitted' where id=f.task_id;get diagnostics n=row_count;
      if n<>0 then raise exception 'FAIL: viewer obtained edit rights';end if;
    end if;
    execute 'reset role';
  end loop;
end $$;
rollback;
select 'PASS: all active users/projects; exact completion undo, schedule and soft-delete undo; foreign, reused, expired and stale receipts rejected; private data and editor permissions unchanged; fixtures rolled back' verification;
