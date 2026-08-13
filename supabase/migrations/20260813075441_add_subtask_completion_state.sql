-- Persist the three visual states of a task subtask while keeping the legacy
-- is_done boolean in sync for older application versions.
alter table public.task_subtasks
  add column if not exists completion_state text;

update public.task_subtasks
   set completion_state = case when is_done then 'done' else 'not_done' end
 where completion_state is null
    or completion_state not in ('not_done', 'partial', 'done');

alter table public.task_subtasks
  alter column completion_state set default 'not_done',
  alter column completion_state set not null;

alter table public.task_subtasks
  drop constraint if exists task_subtasks_completion_state_check;

alter table public.task_subtasks
  add constraint task_subtasks_completion_state_check
  check (completion_state in ('not_done', 'partial', 'done'));

create or replace function public.sync_task_subtask_completion_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.is_done then
      NEW.completion_state := 'done';
    else
      NEW.completion_state := coalesce(NEW.completion_state, 'not_done');
      NEW.is_done := NEW.completion_state = 'done';
    end if;
  elsif NEW.completion_state is distinct from OLD.completion_state then
    NEW.is_done := NEW.completion_state = 'done';
  elsif NEW.is_done is distinct from OLD.is_done then
    NEW.completion_state := case when NEW.is_done then 'done' else 'not_done' end;
  end if;

  if NEW.completion_state = 'done' then
    NEW.completed_at := coalesce(NEW.completed_at, now());
  else
    NEW.completed_at := null;
    NEW.completed_by := null;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_task_subtask_completion_state
  on public.task_subtasks;

create trigger trg_sync_task_subtask_completion_state
before insert or update on public.task_subtasks
for each row execute function public.sync_task_subtask_completion_state();
