-- Calendar timeline task time fields v1
-- Safe to re-run; all columns and constraints are guarded.
-- Also triggers Pages rebuild for recurrence-scope UI changes.
alter table public.tasks
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists duration_minutes integer,
  add column if not exists is_all_day boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_duration_minutes_positive'
  ) then
    alter table public.tasks
      add constraint tasks_duration_minutes_positive
      check (duration_minutes is null or duration_minutes > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_time_order'
  ) then
    alter table public.tasks
      add constraint tasks_time_order
      check (
        start_time is null
        or end_time is null
        or end_time > start_time
      );
  end if;
end $$;
