-- Task recurrence support v1
create table if not exists public.task_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  source_task_id uuid references public.tasks(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  notes text,
  status text default 'planned',
  priority text default 'medium',
  assignee_id uuid references public.app_users(id) on delete set null,
  repeat_type text not null check (repeat_type in ('daily','weekdays','weekly','monthly')),
  weekdays int[] null,
  repeat_until date not null,
  start_date date not null,
  due_date date,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.tasks add column if not exists recurrence_rule_id uuid references public.task_recurrence_rules(id) on delete set null;
alter table public.tasks add column if not exists recurrence_date date;

create unique index if not exists tasks_recurrence_unique
on public.tasks(recurrence_rule_id, recurrence_date)
where recurrence_rule_id is not null and deleted_at is null;

create index if not exists task_recurrence_rules_project_id_idx on public.task_recurrence_rules(project_id);
create index if not exists task_recurrence_rules_deleted_at_idx on public.task_recurrence_rules(deleted_at);
create index if not exists tasks_recurrence_rule_id_idx on public.tasks(recurrence_rule_id);

grant select, insert, update, delete on public.task_recurrence_rules to authenticated;
