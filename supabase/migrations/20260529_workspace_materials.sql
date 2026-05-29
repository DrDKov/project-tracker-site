-- Workspace Materials: owner-only templates and document storage.
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.is_workspace_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.role = 'owner'
      and au.is_active = true
  );
$$;

grant execute on function public.is_workspace_owner() to authenticated;

create table if not exists public.workspace_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  title text not null,
  body text not null default '',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.material_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  name text not null,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.material_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  folder_id uuid references public.material_folders(id) on delete set null,
  original_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_workspace_templates_live on public.workspace_templates(deleted_at, updated_at);
create index if not exists idx_workspace_templates_title on public.workspace_templates using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,'')));
create index if not exists idx_material_folders_live on public.material_folders(deleted_at, name);
create index if not exists idx_material_files_live on public.material_files(deleted_at, folder_id, created_at);

create or replace function public.set_workspace_materials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workspace_templates_updated_at on public.workspace_templates;
create trigger trg_workspace_templates_updated_at
before update on public.workspace_templates
for each row execute function public.set_workspace_materials_updated_at();

drop trigger if exists trg_material_folders_updated_at on public.material_folders;
create trigger trg_material_folders_updated_at
before update on public.material_folders
for each row execute function public.set_workspace_materials_updated_at();

alter table public.workspace_templates enable row level security;
alter table public.material_folders enable row level security;
alter table public.material_files enable row level security;

drop policy if exists workspace_templates_owner_select on public.workspace_templates;
drop policy if exists workspace_templates_owner_insert on public.workspace_templates;
drop policy if exists workspace_templates_owner_update on public.workspace_templates;
drop policy if exists workspace_templates_owner_delete on public.workspace_templates;

create policy workspace_templates_owner_select on public.workspace_templates
for select to authenticated using (public.is_workspace_owner());
create policy workspace_templates_owner_insert on public.workspace_templates
for insert to authenticated with check (public.is_workspace_owner());
create policy workspace_templates_owner_update on public.workspace_templates
for update to authenticated using (public.is_workspace_owner()) with check (public.is_workspace_owner());
create policy workspace_templates_owner_delete on public.workspace_templates
for delete to authenticated using (public.is_workspace_owner());

drop policy if exists material_folders_owner_select on public.material_folders;
drop policy if exists material_folders_owner_insert on public.material_folders;
drop policy if exists material_folders_owner_update on public.material_folders;
drop policy if exists material_folders_owner_delete on public.material_folders;

create policy material_folders_owner_select on public.material_folders
for select to authenticated using (public.is_workspace_owner());
create policy material_folders_owner_insert on public.material_folders
for insert to authenticated with check (public.is_workspace_owner());
create policy material_folders_owner_update on public.material_folders
for update to authenticated using (public.is_workspace_owner()) with check (public.is_workspace_owner());
create policy material_folders_owner_delete on public.material_folders
for delete to authenticated using (public.is_workspace_owner());

drop policy if exists material_files_owner_select on public.material_files;
drop policy if exists material_files_owner_insert on public.material_files;
drop policy if exists material_files_owner_update on public.material_files;
drop policy if exists material_files_owner_delete on public.material_files;

create policy material_files_owner_select on public.material_files
for select to authenticated using (public.is_workspace_owner());
create policy material_files_owner_insert on public.material_files
for insert to authenticated with check (public.is_workspace_owner());
create policy material_files_owner_update on public.material_files
for update to authenticated using (public.is_workspace_owner()) with check (public.is_workspace_owner());
create policy material_files_owner_delete on public.material_files
for delete to authenticated using (public.is_workspace_owner());

insert into storage.buckets (id, name, public)
values ('workspace-materials', 'workspace-materials', false)
on conflict (id) do nothing;

drop policy if exists workspace_materials_storage_select_owner on storage.objects;
drop policy if exists workspace_materials_storage_insert_owner on storage.objects;
drop policy if exists workspace_materials_storage_update_owner on storage.objects;
drop policy if exists workspace_materials_storage_delete_owner on storage.objects;

create policy workspace_materials_storage_select_owner on storage.objects
for select to authenticated
using (bucket_id = 'workspace-materials' and public.is_workspace_owner());

create policy workspace_materials_storage_insert_owner on storage.objects
for insert to authenticated
with check (bucket_id = 'workspace-materials' and public.is_workspace_owner());

create policy workspace_materials_storage_update_owner on storage.objects
for update to authenticated
using (bucket_id = 'workspace-materials' and public.is_workspace_owner())
with check (bucket_id = 'workspace-materials' and public.is_workspace_owner());

create policy workspace_materials_storage_delete_owner on storage.objects
for delete to authenticated
using (bucket_id = 'workspace-materials' and public.is_workspace_owner());
