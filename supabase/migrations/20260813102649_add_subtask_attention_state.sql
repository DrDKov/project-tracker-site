-- Add the red "requires attention" state after the completed state.
alter table public.task_subtasks
  drop constraint if exists task_subtasks_completion_state_check;

alter table public.task_subtasks
  add constraint task_subtasks_completion_state_check
  check (completion_state in ('not_done', 'partial', 'done', 'attention'));
