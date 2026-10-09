-- Tests every active, Auth-linked user under their actual JWT and project access.
-- No working task is changed; fixtures, audit logs and pushes are rolled back.
begin;
create temporary table completion_fixtures as
select u.id user_id,u.auth_user_id,u.display_name, p.id project_id,
  gen_random_uuid() task_id,gen_random_uuid() subtask_id,
  coalesce(u.role in ('owner','admin') or p.owner_id=u.id
    or pm.access_role in ('owner','editor'),false) editor
from public.app_users u cross join public.projects p
left join public.project_members pm on pm.user_id=u.id and pm.project_id=p.id
where u.is_active and u.auth_user_id is not null and p.deleted_at is null
  and (u.role in ('owner','admin') or p.owner_id=u.id or pm.id is not null);
grant select on completion_fixtures to authenticated;
insert into public.tasks(id,project_id,title,status,priority)
select task_id,project_id,'Completion verification rollback','planned','medium'
from completion_fixtures;
insert into public.task_subtasks(id,task_id,title)
select subtask_id,task_id,'Completion verification rollback' from completion_fixtures;

do $$
declare f record; saved jsonb; state text; n integer;
begin
  for f in select * from completion_fixtures loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_user_id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if not f.editor then
      -- Visible but unassigned viewers must not complete other people's tasks.
      begin
        perform public.set_task_completion(f.task_id,true);
        raise exception 'FAIL: unassigned viewer completed a task';
      exception when insufficient_privilege then null; end;
      begin
        perform public.set_subtask_completion(f.subtask_id,'done');
        raise exception 'FAIL: unassigned viewer completed a subtask';
      exception when insufficient_privilege then null; end;
    end if;
    execute 'reset role';
    -- Many-to-many assignment must grant completion only, not general editing.
    insert into public.task_assignees(task_id,user_id) values(f.task_id,f.user_id);
    execute 'set local role authenticated';
    saved:=public.set_task_completion(f.task_id,true);
    if saved->>'status'<>'done' or saved->>'completed_by_id'<>f.user_id::text then
      raise exception 'FAIL: task completion or author for %',f.display_name; end if;
    saved:=public.set_task_completion(f.task_id,false);
    if saved->>'status'<>'in_progress' or saved->>'completed_at' is not null then
      raise exception 'FAIL: task reopen'; end if;
    foreach state in array array['partial','done','attention','not_done'] loop
      saved:=public.set_subtask_completion(f.subtask_id,state);
      if saved->>'completion_state'<>state or (saved->>'is_done')::boolean<>(state='done') then
        raise exception 'FAIL: subtask state % for %',state,f.display_name; end if;
      if state='done' and saved->>'completed_by'<>f.user_id::text then
        raise exception 'FAIL: subtask author'; end if;
    end loop;
    if not f.editor then
      update public.tasks set title='Viewer must not edit' where id=f.task_id;
      get diagnostics n=row_count;
      if n<>0 then raise exception 'FAIL: viewer got general editing'; end if;
    end if;
    begin
      perform public.set_subtask_completion(f.subtask_id,'invalid');
      raise exception 'FAIL: invalid subtask state';
    exception when invalid_parameter_value then null; end;
    begin
      perform public.set_task_completion(f.task_id,null);
      raise exception 'FAIL: null completion';
    exception when invalid_parameter_value then null; end;
    execute 'reset role';
    -- Test the legacy primary-assignee path too.
    delete from public.task_assignees where task_id=f.task_id;
    update public.tasks set assignee_id=f.user_id where id=f.task_id;
    execute 'set local role authenticated';
    perform public.set_task_completion(f.task_id,true);
    perform public.set_subtask_completion(f.subtask_id,'done');
    execute 'reset role';
    update public.tasks set deleted_at=now() where id=f.task_id;
    execute 'set local role authenticated';
    begin
      perform public.set_task_completion(f.task_id,false);
      raise exception 'FAIL: deleted task was writable';
    exception when insufficient_privilege then null; end;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role authenticated';
  begin
    perform public.set_task_completion(gen_random_uuid(),true);
    raise exception 'FAIL: anonymous completion';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end $$;
rollback;
select 'PASS: all active Auth-linked users and visible projects, task done/reopen, all four subtask states, primary/multiple assignment, unassigned viewer denied, viewer cannot edit, deleted/invalid/anonymous denied; all fixtures rolled back' verification;
