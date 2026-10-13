-- One-level visual discussion threads for task comments.
-- Existing comments remain top-level entries with both new columns NULL.
alter table public.task_comments
  add column if not exists reply_to_comment_id uuid,
  add column if not exists thread_root_id uuid;

do $constraints$
begin
  if not exists (select 1 from pg_constraint
      where conrelid='public.task_comments'::regclass
        and conname='task_comments_reply_to_comment_fkey') then
    alter table public.task_comments
      add constraint task_comments_reply_to_comment_fkey
      foreign key (reply_to_comment_id) references public.task_comments(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint
      where conrelid='public.task_comments'::regclass
        and conname='task_comments_thread_root_fkey') then
    alter table public.task_comments
      add constraint task_comments_thread_root_fkey
      foreign key (thread_root_id) references public.task_comments(id) on delete restrict;
  end if;
end $constraints$;

create index if not exists idx_task_comments_thread_root
  on public.task_comments (thread_root_id, created_at, id)
  where thread_root_id is not null;

create or replace function public.validate_task_comment_thread()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_parent public.task_comments%rowtype;
  v_root public.task_comments%rowtype;
  v_expected_root uuid;
begin
  -- Once created, the target of a reply is immutable. Editing the body is unaffected.
  if tg_op = 'UPDATE' then
    if new.task_id is distinct from old.task_id
      or new.reply_to_comment_id is distinct from old.reply_to_comment_id
      or new.thread_root_id is distinct from old.thread_root_id
    then
      raise exception 'Comment thread references cannot be changed';
    end if;
  end if;

  if new.reply_to_comment_id is null then
    if new.thread_root_id is not null then
      raise exception 'Top-level comment must not have a thread root';
    end if;
    return new;
  end if;

  if new.reply_to_comment_id = new.id or new.thread_root_id = new.id then
    raise exception 'Comment cannot reply to itself';
  end if;

  select * into v_parent from public.task_comments
   where id = new.reply_to_comment_id;
  if not found then
    raise exception 'Referenced comment is not available';
  end if;
  if v_parent.task_id is distinct from new.task_id then
    raise exception 'Cannot reply to a comment on another task';
  end if;
  if v_parent.deleted_at is not null and tg_op = 'INSERT' then
    raise exception 'Cannot reply to a deleted comment';
  end if;

  v_expected_root := coalesce(v_parent.thread_root_id, v_parent.id);
  if new.thread_root_id is distinct from v_expected_root then
    raise exception 'Incorrect thread root for reply';
  end if;

  select * into v_root from public.task_comments where id = v_expected_root;
  if not found or v_root.task_id is distinct from new.task_id
     or v_root.reply_to_comment_id is not null then
    raise exception 'Invalid root comment for reply';
  end if;

  -- Replies inherit the originating subtask context; a client cannot relabel it.
  if new.subtask_id is distinct from v_root.subtask_id then
    raise exception 'Reply must inherit the thread subtask';
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_validate_task_comment_thread on public.task_comments;
create trigger trg_validate_task_comment_thread
before insert or update of task_id, reply_to_comment_id, thread_root_id, subtask_id
on public.task_comments
for each row execute function public.validate_task_comment_thread();
