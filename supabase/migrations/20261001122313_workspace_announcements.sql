-- The archive is owner-only; members can read only the current announcement.
create table public.workspace_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_by uuid not null default public.current_app_user_id() references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index workspace_announcements_created_at_idx on public.workspace_announcements (created_at desc, id);
create index workspace_announcements_created_by_idx on public.workspace_announcements (created_by);

create table public.workspace_announcement_current (
  singleton boolean primary key default true check (singleton),
  announcement_id uuid not null unique references public.workspace_announcements(id),
  title text not null,
  body text not null,
  published_at timestamptz not null
);

create table public.workspace_announcement_reads (
  user_id uuid not null default public.current_app_user_id() references public.app_users(id) on delete cascade,
  announcement_id uuid not null references public.workspace_announcements(id),
  seen_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
create index workspace_announcement_reads_announcement_idx on public.workspace_announcement_reads (announcement_id);

alter table public.workspace_announcements enable row level security;
alter table public.workspace_announcement_current enable row level security;
alter table public.workspace_announcement_reads enable row level security;
revoke all on public.workspace_announcements, public.workspace_announcement_current, public.workspace_announcement_reads from anon, public;
grant select, insert, update on public.workspace_announcements, public.workspace_announcement_current to authenticated;
grant select, insert on public.workspace_announcement_reads to authenticated;

create policy announcements_owner_select on public.workspace_announcements for select to authenticated
  using ((select public.is_workspace_owner()));
create policy announcements_owner_insert on public.workspace_announcements for insert to authenticated
  with check ((select public.is_workspace_owner()) and created_by = (select public.current_app_user_id()) and published_at is null);
create policy announcements_owner_update on public.workspace_announcements for update to authenticated
  using ((select public.is_workspace_owner()) and published_at is null)
  with check ((select public.is_workspace_owner()) and created_by = (select public.current_app_user_id()));

create policy announcement_current_member_select on public.workspace_announcement_current for select to authenticated
  using (coalesce((select public.current_user_workspace_role()), '') <> '');
create policy announcement_current_owner_insert on public.workspace_announcement_current for insert to authenticated
  with check ((select public.is_workspace_owner()));
create policy announcement_current_owner_update on public.workspace_announcement_current for update to authenticated
  using ((select public.is_workspace_owner())) with check ((select public.is_workspace_owner()));

create policy announcement_reads_self_select on public.workspace_announcement_reads for select to authenticated
  using (user_id = (select public.current_app_user_id()) and coalesce((select public.current_user_workspace_role()), '') <> '');
create policy announcement_reads_self_insert on public.workspace_announcement_reads for insert to authenticated
  with check (user_id = (select public.current_app_user_id()) and coalesce((select public.current_user_workspace_role()), '') <> '');

-- Publish and update the member-visible snapshot atomically, under the owner's RLS.
create function public.publish_workspace_announcement(p_announcement_id uuid)
returns public.workspace_announcement_current
language plpgsql security invoker set search_path = ''
as $$
declare
  draft public.workspace_announcements;
  published public.workspace_announcement_current;
begin
  if auth.uid() is null or not public.is_workspace_owner() then
    raise exception 'Only the workspace owner can publish announcements' using errcode = '42501';
  end if;
  -- Serialize concurrent publishes, so the latest publication wins deterministically.
  perform pg_advisory_xact_lock(hashtext('workspace_announcement_publish'));
  select * into draft from public.workspace_announcements where id = p_announcement_id for update;
  if not found then raise exception 'Announcement not found'; end if;
  if draft.published_at is not null then raise exception 'Announcement already published'; end if;
  update public.workspace_announcements
    set published_at = clock_timestamp(), updated_at = clock_timestamp()
    where id = draft.id returning * into draft;
  insert into public.workspace_announcement_current (singleton, announcement_id, title, body, published_at)
    values (true, draft.id, draft.title, draft.body, draft.published_at)
    on conflict (singleton) do update set announcement_id = excluded.announcement_id,
      title = excluded.title, body = excluded.body, published_at = excluded.published_at
    returning * into published;
  return published;
end;
$$;
revoke all on function public.publish_workspace_announcement(uuid) from public, anon;
grant execute on function public.publish_workspace_announcement(uuid) to authenticated;
