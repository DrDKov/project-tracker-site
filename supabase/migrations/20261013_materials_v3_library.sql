-- Materials 3.0: one typed library, preserving legacy templates, folders and files.
create table if not exists public.workspace_library (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.app_users(id),
 kind text not null check(kind in ('document','template','file','link')),
 scope text not null default 'personal' check(scope in ('personal','project','team')),
 project_id uuid references public.projects(id),
 title text not null check(length(btrim(title)) between 1 and 500),
 body text not null default '',
 collection_name text not null default '',
 storage_bucket text,
 storage_path text,
 original_name text,
 mime_type text,
 size_bytes bigint,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 constraint library_project_scope check((scope='project')=(project_id is not null)),
 constraint library_file_storage check(kind<>'file' or (storage_bucket is not null and storage_path is not null))
);
create index if not exists library_scope_idx on public.workspace_library(scope,project_id,updated_at desc) where deleted_at is null;
create index if not exists library_owner_idx on public.workspace_library(owner_id,updated_at desc) where deleted_at is null;

create or replace function public.library_can_read(p_owner uuid,p_scope text,p_project uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(
  public.current_app_user_id()=p_owner
  or (p_scope='team' and exists(
     select 1 from public.app_users u where u.id=public.current_app_user_id() and u.is_active))
  or (p_scope='project' and p_project is not null and public.can_view_project(p_project))
 ,false)
$$;
create or replace function public.library_can_edit(p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.current_app_user_id()=p_owner,false)
$$;
create or replace function public.library_can_read_id(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_library m where m.id=p_id and m.deleted_at is null
 and public.library_can_read(m.owner_id,m.scope,m.project_id))
$$;
create or replace function public.library_can_edit_id(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_library m where m.id=p_id and m.deleted_at is null
 and public.library_can_edit(m.owner_id))
$$;

alter table public.workspace_library enable row level security;
revoke all on public.workspace_library from anon;
grant select,insert,update,delete on public.workspace_library to authenticated;
create policy library_read on public.workspace_library for select to authenticated
 using (deleted_at is null and public.library_can_read(owner_id,scope,project_id));
create policy library_insert on public.workspace_library for insert to authenticated
 with check(owner_id=public.current_app_user_id()
  and (scope<>'project' or public.can_edit_project(project_id)));
create policy library_update on public.workspace_library for update to authenticated
 using(public.library_can_edit(owner_id))
 with check(owner_id=public.current_app_user_id()
  and (scope<>'project' or public.can_edit_project(project_id)));
create policy library_delete on public.workspace_library for delete to authenticated
 using(public.library_can_edit(owner_id));

-- A storage object is owned by the corresponding library record. Links are
-- only issued after a fresh permission check, not merely because URL is known.
insert into storage.buckets(id,name,public) values('workspace-library','workspace-library',false)
 on conflict(id) do nothing;
create policy "library_file_read" on storage.objects for select to authenticated
 using(bucket_id='workspace-library' and public.library_can_read_id((split_part(name,'/',1))::uuid));
create policy "library_file_add" on storage.objects for insert to authenticated
 with check(bucket_id='workspace-library' and public.library_can_edit_id((split_part(name,'/',1))::uuid));
create policy "library_file_remove" on storage.objects for delete to authenticated
 using(bucket_id='workspace-library' and public.library_can_edit_id((split_part(name,'/',1))::uuid));

-- Imported items remain personal to their creator / original workspace owner.
-- IDs are preserved for traceability. The original private bucket is untouched.
insert into public.workspace_library(id,owner_id,kind,scope,title,body,collection_name,created_at,updated_at)
select t.id,coalesce(t.created_by,(select u.id from public.app_users u where u.role='owner' order by u.created_at limit 1)),
 'template','personal',t.title,t.body,'Шаблоны',t.created_at,t.updated_at
from public.workspace_templates t where t.deleted_at is null
on conflict(id) do nothing;

insert into public.workspace_library
(id,owner_id,kind,scope,title,collection_name,storage_bucket,storage_path,original_name,mime_type,size_bytes,created_at,updated_at)
select f.id,coalesce(f.created_by,(select u.id from public.app_users u where u.role='owner' order by u.created_at limit 1)),
 'file','personal',f.original_name,coalesce(folder.name,'Без коллекции'),
 'workspace-materials',f.storage_path,f.original_name,f.mime_type,f.size_bytes,f.created_at,f.created_at
from public.material_files f left join public.material_folders folder on folder.id=f.folder_id
where f.deleted_at is null
on conflict(id) do nothing;
