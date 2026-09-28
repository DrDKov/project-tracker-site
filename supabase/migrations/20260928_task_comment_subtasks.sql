-- Link task comments to a specific subtask while keeping ordinary task comments intact.
alter table public.task_comments
  add column if not exists subtask_id uuid,
  add column if not exists updated_at timestamptz;

-- Existing comments were not edited when this column was introduced.
update public.task_comments
set updated_at = created_at
where updated_at is null;

alter table public.task_comments
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'task_comments_subtask_id_fkey'
      and conrelid = 'public.task_comments'::regclass
  ) then
    alter table public.task_comments
      add constraint task_comments_subtask_id_fkey
      foreign key (subtask_id) references public.task_subtasks(id) on delete set null;
  end if;
end $$;

create index if not exists idx_task_comments_subtask_id
  on public.task_comments (subtask_id);

create or replace function public.validate_task_comment_subtask()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.subtask_id is not null and not exists (
    select 1
    from public.task_subtasks s
    where s.id = new.subtask_id
      and s.task_id = new.task_id
      and s.deleted_at is null
  ) then
    raise exception 'Subtask does not belong to this task or is deleted';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_task_comment_subtask on public.task_comments;
create trigger trg_validate_task_comment_subtask
before insert or update of subtask_id, task_id on public.task_comments
for each row execute function public.validate_task_comment_subtask();

-- A legacy policy allowed any project viewer to update every comment.
-- Soft deletion uses its permission-checked RPC; direct updates use the author/admin policy.
drop policy if exists task_comments_soft_delete_visible_task on public.task_comments;
