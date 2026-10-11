-- Project-scoped RLS for the existing private project-chat-files bucket.
-- This migration changes no stored objects and no project messages.
-- Owners of individual files may edit/delete only while still members of the project.
-- Path format: project UUID / single filename; invalid paths are rejected.
drop policy if exists "project_chat_files_select" on storage.objects;
drop policy if exists "project_chat_files_insert" on storage.objects;
drop policy if exists "project_chat_files_update" on storage.objects;
drop policy if exists "project_chat_files_delete" on storage.objects;

create policy "project_chat_files_select" on storage.objects
for select to authenticated using (
  bucket_id = 'project-chat-files'
  and (select exists (
    select 1 from public.app_users u
    where u.auth_user_id = (select auth.uid()) and u.is_active
  ))
  and case when name ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[^/]+$'
    then public.can_view_project(split_part(name, '/', 1)::uuid)
    else false end
);

create policy "project_chat_files_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'project-chat-files'
  and (select exists (
    select 1 from public.app_users u
    where u.auth_user_id = (select auth.uid()) and u.is_active
  ))
  and case when name ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[^/]+$'
    then public.can_view_project(split_part(name, '/', 1)::uuid)
    else false end
);

create policy "project_chat_files_update" on storage.objects
for update to authenticated using (
  bucket_id = 'project-chat-files'
  and (select exists (
    select 1 from public.app_users u
    where u.auth_user_id = (select auth.uid()) and u.is_active
  ))
  and case when name ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[^/]+$'
    then public.can_view_project(split_part(name, '/', 1)::uuid)
      and (
        owner_id = (select auth.uid())::text
        or public.can_edit_project(split_part(name, '/', 1)::uuid)
      )
    else false end
) with check (
  bucket_id = 'project-chat-files'
  and (select exists (
    select 1 from public.app_users u
    where u.auth_user_id = (select auth.uid()) and u.is_active
  ))
  and case when name ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[^/]+$'
    then public.can_view_project(split_part(name, '/', 1)::uuid)
      and (
        owner_id = (select auth.uid())::text
        or public.can_edit_project(split_part(name, '/', 1)::uuid)
      )
    else false end
);

create policy "project_chat_files_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'project-chat-files'
  and (select exists (
    select 1 from public.app_users u
    where u.auth_user_id = (select auth.uid()) and u.is_active
  ))
  and case when name ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[^/]+$'
    then public.can_view_project(split_part(name, '/', 1)::uuid)
      and (
        owner_id = (select auth.uid())::text
        or public.can_edit_project(split_part(name, '/', 1)::uuid)
      )
    else false end
);
