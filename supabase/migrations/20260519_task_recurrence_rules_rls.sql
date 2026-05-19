-- RLS policies for task recurrence rules
-- Apply after 20260519_task_recurrence_rules.sql

alter table public.task_recurrence_rules enable row level security;

drop policy if exists task_recurrence_rules_select on public.task_recurrence_rules;
drop policy if exists task_recurrence_rules_insert on public.task_recurrence_rules;
drop policy if exists task_recurrence_rules_update on public.task_recurrence_rules;
drop policy if exists task_recurrence_rules_delete on public.task_recurrence_rules;

create policy task_recurrence_rules_select
on public.task_recurrence_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
);

create policy task_recurrence_rules_insert
on public.task_recurrence_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and (created_by is null or created_by = au.id)
  )
);

create policy task_recurrence_rules_update
on public.task_recurrence_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
);

create policy task_recurrence_rules_delete
on public.task_recurrence_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
);

grant select, insert, update, delete on public.task_recurrence_rules to authenticated;
