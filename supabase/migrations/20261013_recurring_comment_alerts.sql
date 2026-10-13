-- One bell notification per recipient/comment, independent of browser session.
create table if not exists public.task_comment_alerts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.app_users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  comment_id uuid not null references public.task_comments(id) on delete cascade,
  author_id uuid not null references public.app_users(id),
  kind text not null check (kind in ('reply','thread')),
  created_at timestamptz not null default now(),
  constraint task_comment_alerts_one_per_recipient unique(recipient_id,comment_id)
);
create index if not exists task_comment_alerts_recipient_recent
  on public.task_comment_alerts(recipient_id,created_at desc);
alter table public.task_comment_alerts enable row level security;
revoke all on public.task_comment_alerts from anon,authenticated;
grant select on public.task_comment_alerts to authenticated;
drop policy if exists task_comment_alerts_read on public.task_comment_alerts;
create policy task_comment_alerts_read on public.task_comment_alerts
 for select to authenticated
 using (
  recipient_id=public.current_app_user_id()
  and exists(select 1 from public.tasks t
             where t.id=task_id and t.deleted_at is null
               and public.can_view_project(t.project_id))
 );

create or replace function public.emit_task_comment_alerts()
returns trigger
language plpgsql security definer
set search_path=''
as $body$
begin
  if new.deleted_at is not null or new.reply_to_comment_id is null or new.thread_root_id is null then
    return new;
  end if;
  -- Notify everyone who contributed to the existing thread; direct target
  -- gets "reply", everyone else gets "thread". No duplicates or self-notices.
  insert into public.task_comment_alerts(recipient_id,task_id,comment_id,author_id,kind,created_at)
  select c.user_id,new.task_id,new.id,new.user_id,
         case when bool_or(c.id=new.reply_to_comment_id) then 'reply' else 'thread' end,
         new.created_at
  from public.task_comments c
  where c.task_id=new.task_id and c.id<>new.id and c.deleted_at is null
    and (c.id=new.thread_root_id or c.id=new.reply_to_comment_id or c.thread_root_id=new.thread_root_id)
    and c.user_id is not null and c.user_id<>new.user_id
  group by c.user_id
  on conflict (recipient_id,comment_id) do nothing;
  return new;
end;
$body$;
revoke all on function public.emit_task_comment_alerts() from public,anon,authenticated;
drop trigger if exists task_comment_alerts_on_reply on public.task_comments;
create trigger task_comment_alerts_on_reply
 after insert on public.task_comments
 for each row execute function public.emit_task_comment_alerts();

-- Web Push delivery for recurring series is claimed only once per user and series.
alter table public.push_delivery_log
 add column if not exists recurrence_rule_id uuid references public.task_recurrence_rules(id);
create unique index if not exists push_delivery_once_per_series_recipient
 on public.push_delivery_log(recurrence_rule_id,user_id)
 where recurrence_rule_id is not null;

do $pub$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='task_comment_alerts')
 then alter publication supabase_realtime add table public.task_comment_alerts; end if;
end $pub$;
