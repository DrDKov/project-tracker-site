-- Workspace v20260529: server-side validation for task comment @mentions.
-- Run in Supabase SQL Editor after the task_comments migration.
-- Goal:
-- - owner can mention any active app user;
-- - non-owner can mention only users sharing at least one project;
-- - direct Supabase inserts/updates cannot bypass the client-side mention filter;
-- - comment author cannot be spoofed by changing user_id in the payload.

create extension if not exists pgcrypto;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_comments_task_id on public.task_comments(task_id);
create index if not exists idx_task_comments_user_id on public.task_comments(user_id);
create index if not exists idx_task_comments_visible on public.task_comments(task_id, deleted_at, created_at);

alter table public.task_comments enable row level security;

create or replace function public.workspace_escape_regex(p_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_text,''), '([\\.^$|?*+(){}\[\]])', '\\\1', 'g');
$$;

create or replace function public.workspace_text_mentions_label(p_body text, p_label text)
returns boolean
language sql
immutable
as $$
  select case
    when coalesce(trim(p_label),'') = '' then false
    else coalesce(p_body,'') ~* (
      '(^|[[:space:]\(\[\{,;:])@'
      || public.workspace_escape_regex(trim(p_label))
      || '($|[[:space:]\)\]\},.!?;:])'
    )
  end;
$$;

create or replace function public.workspace_text_mentions_user(p_body text, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_users au
    cross join lateral (
      values (au.display_name), (au.email)
    ) labels(label)
    where au.id = p_user_id
      and au.is_active = true
      and public.workspace_text_mentions_label(p_body, labels.label)
  );
$$;

create or replace function public.workspace_user_is_owner(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_users au
    where au.id = p_user_id
      and au.is_active = true
      and au.role = 'owner'
  );
$$;

create or replace function public.workspace_user_project_ids(p_user_id uuid)
returns table(project_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select p.id
  from public.projects p
  where p.owner_id = p_user_id
    and p.deleted_at is null

  union

  select pm.project_id
  from public.project_members pm
  join public.projects p on p.id = pm.project_id
  where pm.user_id = p_user_id
    and p.deleted_at is null;
$$;

create or replace function public.workspace_users_share_project(p_left_user_id uuid, p_right_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_user_project_ids(p_left_user_id) lp
    join public.workspace_user_project_ids(p_right_user_id) rp on rp.project_id = lp.project_id
  );
$$;

create or replace function public.can_mention_app_user(p_author_id uuid, p_target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_author_id is not null
    and p_target_id is not null
    and exists (
      select 1 from public.app_users a
      where a.id = p_author_id and a.is_active = true
    )
    and exists (
      select 1 from public.app_users t
      where t.id = p_target_id and t.is_active = true
    )
    and (
      p_author_id = p_target_id
      or public.workspace_user_is_owner(p_author_id)
      or public.workspace_users_share_project(p_author_id, p_target_id)
    );
$$;

create or replace function public.validate_task_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_project_id uuid;
  v_target record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_current_user_id := public.current_app_user_id();
  if v_current_user_id is null then
    raise exception 'Workspace profile not found';
  end if;

  if new.user_id is null then
    new.user_id := v_current_user_id;
  end if;

  if new.user_id is distinct from v_current_user_id then
    raise exception 'Comment author mismatch';
  end if;

  select t.project_id into v_project_id
  from public.tasks t
  where t.id = new.task_id
    and t.deleted_at is null;

  if v_project_id is null then
    raise exception 'Task not found';
  end if;

  if not public.can_view_project(v_project_id) then
    raise exception 'No permission to comment on this task';
  end if;

  for v_target in
    select au.id, au.display_name, au.email
    from public.app_users au
    where au.is_active = true
      and au.id is distinct from new.user_id
      and public.workspace_text_mentions_user(new.body, au.id)
  loop
    if not public.can_mention_app_user(new.user_id, v_target.id) then
      raise exception 'No permission to mention user %', coalesce(v_target.display_name, v_target.email, v_target.id::text);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_task_comment_mentions on public.task_comments;
create trigger trg_validate_task_comment_mentions
before insert or update of body, task_id, user_id on public.task_comments
for each row execute function public.validate_task_comment_mentions();

-- RLS is kept aligned with the trigger. Even if a broader legacy policy exists,
-- the trigger still blocks forbidden mentions and user_id spoofing.
drop policy if exists task_comments_select_visible on public.task_comments;
create policy task_comments_select_visible
on public.task_comments
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.tasks t
    where t.id = task_comments.task_id
      and public.can_view_project(t.project_id)
  )
);

drop policy if exists task_comments_insert_visible_self on public.task_comments;
create policy task_comments_insert_visible_self
on public.task_comments
for insert
to authenticated
with check (
  user_id = public.current_app_user_id()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_comments.task_id
      and t.deleted_at is null
      and public.can_view_project(t.project_id)
  )
);

drop policy if exists task_comments_update_author_or_admin on public.task_comments;
create policy task_comments_update_author_or_admin
on public.task_comments
for update
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.is_app_admin()
)
with check (
  user_id = public.current_app_user_id()
  or public.is_app_admin()
);

drop policy if exists task_comments_delete_author_or_admin on public.task_comments;
create policy task_comments_delete_author_or_admin
on public.task_comments
for delete
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.is_app_admin()
);

create or replace function public.soft_delete_task_comment(p_comment_id uuid)
returns public.task_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.task_comments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_comment
  from public.task_comments
  where id = p_comment_id
    and deleted_at is null;

  if v_comment.id is null then
    raise exception 'Comment not found';
  end if;

  if v_comment.user_id is distinct from public.current_app_user_id()
     and not public.is_app_admin() then
    raise exception 'No permission to delete this comment';
  end if;

  update public.task_comments
  set deleted_at = now(),
      updated_at = now()
  where id = p_comment_id
  returning * into v_comment;

  return v_comment;
end;
$$;

grant execute on function public.workspace_escape_regex(text) to authenticated;
grant execute on function public.workspace_text_mentions_label(text,text) to authenticated;
grant execute on function public.workspace_text_mentions_user(text,uuid) to authenticated;
grant execute on function public.workspace_user_is_owner(uuid) to authenticated;
grant execute on function public.workspace_user_project_ids(uuid) to authenticated;
grant execute on function public.workspace_users_share_project(uuid,uuid) to authenticated;
grant execute on function public.can_mention_app_user(uuid,uuid) to authenticated;
grant execute on function public.soft_delete_task_comment(uuid) to authenticated;
