-- Materials 3.1: live references to existing shared/project resources from tasks.
-- Personal materials are deliberately excluded: referencing a private document never shares it.
create table if not exists public.task_material_links(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 material_id uuid not null references public.workspace_library(id) on delete cascade,
 created_by uuid not null default public.current_app_user_id() references public.app_users(id),
 created_at timestamptz not null default now(),
 constraint task_material_links_unique unique(task_id,material_id)
);
create index if not exists task_material_links_by_task on public.task_material_links(task_id,created_at);
create index if not exists task_material_links_by_material on public.task_material_links(material_id);

create or replace function public.task_material_link_allowed(p_task uuid,p_material uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from public.tasks t
   join public.workspace_library m on m.id=p_material
   where t.id=p_task and t.deleted_at is null and m.deleted_at is null
     and public.can_edit_project(t.project_id)
     and (
       m.scope='team'
       or (m.scope='project' and m.project_id=t.project_id)
     )
 )
$$;

alter table public.task_material_links enable row level security;
revoke all on public.task_material_links from public,anon,authenticated;
grant select,insert,delete on public.task_material_links to authenticated;
drop policy if exists task_material_links_read on public.task_material_links;
create policy task_material_links_read on public.task_material_links for select to authenticated
 using (
   exists(select 1 from public.tasks t where t.id=task_id
      and t.deleted_at is null and public.can_view_project(t.project_id))
   and public.library_can_read_id(material_id)
 );
drop policy if exists task_material_links_add on public.task_material_links;
create policy task_material_links_add on public.task_material_links for insert to authenticated
 with check (
   created_by=public.current_app_user_id()
   and public.task_material_link_allowed(task_id,material_id)
 );
drop policy if exists task_material_links_remove on public.task_material_links;
create policy task_material_links_remove on public.task_material_links for delete to authenticated
 using (
   exists(select 1 from public.tasks t where t.id=task_id
     and t.deleted_at is null and public.can_edit_project(t.project_id))
 );
do $pub$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='task_material_links')
 then alter publication supabase_realtime add table public.task_material_links; end if;
end $pub$;
