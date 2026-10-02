-- Verification only. All sample records, audit records and queued pushes roll back.
begin;
create temporary table ack_test_fixture as
select gen_random_uuid() as project_id,gen_random_uuid() as task_id,
  gen_random_uuid() as legacy_task_id,
  (select id from public.app_users where role='owner' and is_active and auth_user_id is not null limit 1) as owner_id,
  (select auth_user_id from public.app_users where role='owner' and is_active and auth_user_id is not null limit 1) as owner_auth,
  (select id from public.app_users where role='member' and is_active and auth_user_id is not null order by id limit 1) as member_id,
  (select auth_user_id from public.app_users where role='member' and is_active and auth_user_id is not null order by id limit 1) as member_auth;
grant select on ack_test_fixture to authenticated;
insert into public.projects(id,name,owner_id,status)
select project_id,'Acknowledgement rollback test',owner_id,'planned' from ack_test_fixture;
insert into public.tasks(id,project_id,title,status,priority,assignee_id)
select task_id,project_id,'Receipt rollback test','planned','medium',member_id from ack_test_fixture
union all select legacy_task_id,project_id,'Legacy receipt rollback test','planned','medium',member_id from ack_test_fixture;
insert into public.task_assignees(task_id,user_id) select task_id,member_id from ack_test_fixture;

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_auth,'role','authenticated')::text,true) from ack_test_fixture;
do $$ begin
  begin
    perform public.acknowledge_task((select task_id from ack_test_fixture));
    raise exception 'FAIL: owner could acknowledge for assignee';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('sub',member_auth,'role','authenticated')::text,true) from ack_test_fixture;
do $$ declare receipt public.task_acknowledgements; again public.task_acknowledgements;
begin
  receipt:=public.acknowledge_task((select task_id from ack_test_fixture));
  again:=public.acknowledge_task((select task_id from ack_test_fixture));
  if receipt.id is null or receipt.id<>again.id or receipt.acknowledged_at<>again.acknowledged_at then
    raise exception 'FAIL: missing or non-idempotent receipt'; end if;
  if (select status from public.tasks where id=receipt.task_id)<>'planned' then
    raise exception 'FAIL: acknowledgement changed task status'; end if;
  if receipt.user_id<>(select member_id from ack_test_fixture) then
    raise exception 'FAIL: wrong author'; end if;
  receipt:=public.acknowledge_task((select legacy_task_id from ack_test_fixture));
  if receipt.id is null or receipt.assignment_id is not null then raise exception 'FAIL: legacy assignment'; end if;
  begin
    insert into public.task_acknowledgements(task_id,user_id,assignment_token)
    select task_id,owner_id,gen_random_uuid() from ack_test_fixture;
    raise exception 'FAIL: could forge someone else receipt';
  exception when insufficient_privilege then null; end;
  begin
    update public.task_acknowledgements set acknowledged_at=now();
    raise exception 'FAIL: could edit receipts';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('sub',owner_auth,'role','authenticated')::text,true) from ack_test_fixture;
do $$ declare old_id uuid; new_id uuid;
begin
  select id into old_id from public.task_assignees where task_id=(select task_id from ack_test_fixture);
  update public.tasks set title='Edited without reassignment',assignee_revision=gen_random_uuid()
    where id in (select task_id from ack_test_fixture union all select legacy_task_id from ack_test_fixture);
  perform public.sync_task_assignees((select task_id from ack_test_fixture),array[(select member_id from ack_test_fixture)]);
  if (select count(*) from public.task_acknowledgements where task_id in
    (select task_id from ack_test_fixture union all select legacy_task_id from ack_test_fixture))<>2 then
    raise exception 'FAIL: ordinary edits reset receipt'; end if;
  if (select id from public.task_assignees where task_id=(select task_id from ack_test_fixture))<>old_id then
    raise exception 'FAIL: assignment IDs changed during ordinary edit'; end if;
  perform public.sync_task_assignees((select task_id from ack_test_fixture),'{}'::uuid[]);
  perform public.sync_task_assignees((select task_id from ack_test_fixture),array[(select member_id from ack_test_fixture)]);
  select id into new_id from public.task_assignees where task_id=(select task_id from ack_test_fixture);
  if new_id=old_id or exists(select 1 from public.task_acknowledgements where task_id=(select task_id from ack_test_fixture)) then
    raise exception 'FAIL: reassignment reused receipt'; end if;
  update public.tasks set assignee_id=null where id=(select legacy_task_id from ack_test_fixture);
  update public.tasks set assignee_id=(select member_id from ack_test_fixture) where id=(select legacy_task_id from ack_test_fixture);
  if exists(select 1 from public.task_acknowledgements where task_id=(select legacy_task_id from ack_test_fixture)) then
    raise exception 'FAIL: legacy reassignment reused receipt'; end if;
end $$;

select set_config('request.jwt.claims',jsonb_build_object('sub',member_auth,'role','authenticated')::text,true) from ack_test_fixture;
do $$ begin
  if (public.acknowledge_task((select task_id from ack_test_fixture))).id is null then
    raise exception 'FAIL: new assignment not acknowledgeable'; end if;
  if (public.acknowledge_task((select legacy_task_id from ack_test_fixture))).id is null then
    raise exception 'FAIL: new legacy assignment not acknowledgeable'; end if;
end $$;
reset role;
rollback;
select 'PASS: own acknowledgement, no impersonation, idempotency, status preserved, legacy assignments, edit/reassignment lifecycle; all data rolled back' as verification;
