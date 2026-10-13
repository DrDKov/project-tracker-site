-- Materials 3.2: version ledger, individually shared editors, reversible trash and workflow templates.
alter table public.workspace_library add column if not exists version_number integer not null default 1;
alter table public.workspace_library drop constraint if exists workspace_library_kind_check;
alter table public.workspace_library add constraint workspace_library_kind_check
 check (kind in ('document','template','file','link','workflow'));

create table if not exists public.library_access (
 material_id uuid not null references public.workspace_library(id) on delete cascade,
 user_id uuid not null references public.app_users(id) on delete cascade,
 permission text not null default 'editor' check (permission='editor'),
 granted_by uuid references public.app_users(id),
 created_at timestamptz not null default now(),
 primary key (material_id,user_id)
);
create index if not exists library_access_by_user on public.library_access(user_id,material_id);
create table if not exists public.library_versions (
 id uuid primary key default gen_random_uuid(),
 material_id uuid not null references public.workspace_library(id) on delete cascade,
 version_number integer not null,
 title text not null,
 body text not null,
 collection_name text not null default '',
 storage_bucket text,
 storage_path text,
 original_name text,
 mime_type text,
 size_bytes bigint,
 edited_by uuid references public.app_users(id),
 created_at timestamptz not null default now(),
 unique(material_id,version_number)
);
create index if not exists library_versions_recent on public.library_versions(material_id,version_number desc);

create or replace function public.library_is_owner_id(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_library m where m.id=p_id
  and m.owner_id=public.current_app_user_id())
$$;
create or replace function public.library_can_read_id(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_library m where m.id=p_id and m.deleted_at is null
 and (public.library_can_read(m.owner_id,m.scope,m.project_id)
      or exists(select 1 from public.library_access a where a.material_id=m.id
                  and a.user_id=public.current_app_user_id()
                  and a.permission='editor')))
$$;
create or replace function public.library_can_edit_id(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_library m where m.id=p_id and m.deleted_at is null
 and (m.owner_id=public.current_app_user_id()
      or exists(select 1 from public.library_access a where a.material_id=m.id
                  and a.user_id=public.current_app_user_id()
                  and a.permission='editor')))
$$;
drop policy if exists library_read on public.workspace_library;
create policy library_read on public.workspace_library for select to authenticated
 using (public.library_can_read_id(id) or (deleted_at is not null and owner_id=public.current_app_user_id()));
drop policy if exists library_update on public.workspace_library;
create policy library_update on public.workspace_library for update to authenticated
 using(public.library_can_edit_id(id))
 with check(public.library_can_edit_id(id));
drop policy if exists library_delete on public.workspace_library;
create policy library_delete on public.workspace_library for delete to authenticated
 using(public.library_is_owner_id(id));

alter table public.library_access enable row level security;
revoke all on public.library_access from public,anon,authenticated;
grant select,insert,delete on public.library_access to authenticated;
create policy library_access_select on public.library_access for select to authenticated
 using(public.library_is_owner_id(material_id) or user_id=public.current_app_user_id());
create policy library_access_insert on public.library_access for insert to authenticated
 with check(public.library_is_owner_id(material_id)
  and user_id<>public.current_app_user_id()
  and exists(select 1 from public.app_users u where u.id=user_id and u.is_active));
create policy library_access_delete on public.library_access for delete to authenticated
 using(public.library_is_owner_id(material_id));

alter table public.library_versions enable row level security;
revoke all on public.library_versions from public,anon,authenticated;
grant select on public.library_versions to authenticated;
create policy library_versions_read on public.library_versions for select to authenticated
 using(public.library_can_read_id(material_id)
  or public.library_is_owner_id(material_id));

-- Existing file versions in the original private bucket follow live material permissions.
create policy library_legacy_file_read on storage.objects for select to authenticated
 using(bucket_id='workspace-materials' and exists(
   select 1 from public.library_versions v
   where v.storage_bucket='workspace-materials' and v.storage_path=name
     and public.library_can_read_id(v.material_id)
 ));

-- Protect revision history against an ordinary UPDATE that bypasses the version RPC.
create or replace function public.library_guard_revision()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.owner_id is distinct from old.owner_id or new.kind is distinct from old.kind then
  raise exception 'Material owner and kind are immutable';
 end if;
 if old.owner_id is distinct from public.current_app_user_id()
    and (new.scope is distinct from old.scope or new.project_id is distinct from old.project_id
         or new.deleted_at is distinct from old.deleted_at) then
  raise exception 'Only the material owner can change visibility or delete';
 end if;
 if new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.collection_name is distinct from old.collection_name
    or new.storage_path is distinct from old.storage_path
    or new.storage_bucket is distinct from old.storage_bucket
    or new.original_name is distinct from old.original_name
    or new.mime_type is distinct from old.mime_type
    or new.size_bytes is distinct from old.size_bytes
    or new.version_number is distinct from old.version_number then
   if current_setting('app.library_revision_write',true) is distinct from 'yes' then
    raise exception 'Use versioned material editor to save changes';
   end if;
   if new.version_number<>old.version_number+1 then
    raise exception 'Invalid material revision number';
   end if;
 end if;
 new.updated_at=now();
 return new;
end $$;
drop trigger if exists library_revision_guard on public.workspace_library;
create trigger library_revision_guard before update on public.workspace_library
 for each row execute function public.library_guard_revision();

create or replace function public.library_record_revision()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.library_versions
 (material_id,version_number,title,body,collection_name,storage_bucket,storage_path,
  original_name,mime_type,size_bytes,edited_by)
 values (new.id,new.version_number,new.title,new.body,new.collection_name,
         new.storage_bucket,new.storage_path,new.original_name,new.mime_type,
         new.size_bytes,public.current_app_user_id())
 on conflict(material_id,version_number) do nothing;
 return new;
end $$;
drop trigger if exists library_after_insert on public.workspace_library;
create trigger library_after_insert after insert on public.workspace_library
 for each row execute function public.library_record_revision();
drop trigger if exists library_after_update on public.workspace_library;
create trigger library_after_update after update of version_number on public.workspace_library
 for each row when(new.version_number is distinct from old.version_number)
 execute function public.library_record_revision();
insert into public.library_versions(material_id,version_number,title,body,collection_name,
 storage_bucket,storage_path,original_name,mime_type,size_bytes,edited_by,created_at)
select id,version_number,title,body,collection_name,storage_bucket,storage_path,
 original_name,mime_type,size_bytes,owner_id,coalesce(updated_at,created_at)
from public.workspace_library on conflict(material_id,version_number) do nothing;

create or replace function public.library_save_revision(
 p_id uuid,p_expected_version integer,p_title text,p_body text,p_collection text
) returns public.workspace_library language plpgsql security definer set search_path='' as $$
declare v public.workspace_library%rowtype;
begin
 select * into v from public.workspace_library where id=p_id for update;
 if not found or v.deleted_at is not null or not public.library_can_edit_id(p_id)
 then raise exception 'Material not found or edit access denied'; end if;
 if v.version_number<>p_expected_version then
  raise exception 'Revision conflict: material has changed. Reload and compare updates'
   using errcode='40001';
 end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 500 then
  raise exception 'Invalid title'; end if;
 if v.kind='file' then
  raise exception 'File updates require a new file version'; end if;
 perform set_config('app.library_revision_write','yes',true);
 update public.workspace_library
 set title=btrim(p_title),body=coalesce(p_body,''),collection_name=coalesce(p_collection,''),
     version_number=version_number+1
 where id=p_id returning * into v;
 perform set_config('app.library_revision_write','',true);
 return v;
end $$;

create or replace function public.library_replace_file(
 p_id uuid,p_expected_version integer,p_path text,p_name text,p_mime text,p_size bigint
) returns public.workspace_library language plpgsql security definer set search_path='' as $$
declare v public.workspace_library%rowtype;
begin
 select * into v from public.workspace_library where id=p_id for update;
 if not found or v.kind<>'file' or v.deleted_at is not null or not public.library_can_edit_id(p_id)
 then raise exception 'File unavailable or edit access denied'; end if;
 if v.version_number<>p_expected_version then raise exception 'Revision conflict: reload file first'
 using errcode='40001'; end if;
 if p_path not like p_id::text||'/%' or length(p_path)>600 or p_size<0
 then raise exception 'Invalid file path or size'; end if;
 if not exists(select 1 from storage.objects
  where bucket_id='workspace-library' and name=p_path) then
  raise exception 'Upload new file before replacing it';
 end if;
 perform set_config('app.library_revision_write','yes',true);
 update public.workspace_library
 set storage_bucket='workspace-library',storage_path=p_path,
     original_name=left(coalesce(p_name,'file'),500),mime_type=p_mime,size_bytes=p_size,
     version_number=version_number+1
 where id=p_id returning * into v;
 perform set_config('app.library_revision_write','',true);
 return v;
end $$;

create or replace function public.library_restore_revision(
 p_id uuid,p_restore_version integer,p_expected_version integer
) returns public.workspace_library language plpgsql security definer set search_path='' as $$
declare v public.workspace_library%rowtype; r public.library_versions%rowtype;
begin
 select * into v from public.workspace_library where id=p_id for update;
 if not found or v.deleted_at is not null or not public.library_can_edit_id(p_id) then
  raise exception 'Material unavailable or permission denied'; end if;
 if v.version_number<>p_expected_version then raise exception 'Revision conflict: reload first'
  using errcode='40001'; end if;
 select * into r from public.library_versions where material_id=p_id and version_number=p_restore_version;
 if not found then raise exception 'Revision not found'; end if;
 perform set_config('app.library_revision_write','yes',true);
 update public.workspace_library set title=r.title,body=r.body,collection_name=r.collection_name,
  storage_bucket=r.storage_bucket,storage_path=r.storage_path,original_name=r.original_name,
  mime_type=r.mime_type,size_bytes=r.size_bytes,version_number=version_number+1
 where id=p_id returning * into v;
 perform set_config('app.library_revision_write','',true);
 return v;
end $$;
create or replace function public.library_set_trashed(p_id uuid,p_trashed boolean)
returns public.workspace_library language plpgsql security definer set search_path='' as $$
declare v public.workspace_library%rowtype;
begin
 select * into v from public.workspace_library where id=p_id for update;
 if not found or v.owner_id is distinct from public.current_app_user_id() then
  raise exception 'Only the owner can manage the recycle bin'; end if;
 update public.workspace_library set deleted_at=case when p_trashed then now() else null end
 where id=p_id returning * into v;
 return v;
end $$;

-- Tasks created from workflow templates inherit each checklist item as a subtask.
create or replace function public.library_create_workflow_task(
 p_material_id uuid,p_project_id uuid,p_date date
) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.workspace_library%rowtype; new_task uuid; step text; index_no integer:=0;
begin
 select * into v from public.workspace_library where id=p_material_id and kind='workflow'
  and deleted_at is null;
 if not found or not public.library_can_read_id(p_material_id)
    or not public.can_edit_project(p_project_id) then
  raise exception 'Workflow or project unavailable'; end if;
 insert into public.tasks(project_id,title,notes,status,priority,start_date,due_date)
 values(p_project_id,v.title,v.body,'planned','medium',p_date,p_date)
 returning id into new_task;
 for step in select regexp_replace(line,'^\s*[-*]\s*\[[ xX]\]\s*','')
    from regexp_split_to_table(v.body,E'\n') as line
    where line ~ '^\s*[-*]\s*\[[ xX]\]\s*\S'
    limit 80
 loop
  index_no:=index_no+1;
  insert into public.task_subtasks(task_id,title,sort_order,created_by)
  values(new_task,left(step,500),index_no*10,public.current_app_user_id());
 end loop;
 return new_task;
end $$;

revoke all on function public.library_save_revision(uuid,integer,text,text,text) from public,anon;
revoke all on function public.library_restore_revision(uuid,integer,integer) from public,anon;
revoke all on function public.library_replace_file(uuid,integer,text,text,text,bigint) from public,anon;
revoke all on function public.library_set_trashed(uuid,boolean) from public,anon;
revoke all on function public.library_create_workflow_task(uuid,uuid,date) from public,anon;
grant execute on function public.library_save_revision(uuid,integer,text,text,text) to authenticated;
grant execute on function public.library_restore_revision(uuid,integer,integer) to authenticated;
grant execute on function public.library_replace_file(uuid,integer,text,text,text,bigint) to authenticated;
grant execute on function public.library_set_trashed(uuid,boolean) to authenticated;
grant execute on function public.library_create_workflow_task(uuid,uuid,date) to authenticated;
