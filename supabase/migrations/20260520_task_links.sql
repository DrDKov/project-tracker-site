-- Task links support v1
create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  source_task_id uuid not null references public.tasks(id) on delete cascade,
  target_task_id uuid not null references public.tasks(id) on delete cascade,
  type text not null check (type in ('blocks', 'relates_to')),
  created_by uuid null,
  created_at timestamptz not null default now(),
  constraint task_links_not_self check (source_task_id <> target_task_id),
  constraint task_links_unique unique (source_task_id, target_task_id, type)
);

create index if not exists task_links_source_idx on public.task_links(source_task_id);
create index if not exists task_links_target_idx on public.task_links(target_task_id);
create index if not exists task_links_type_idx on public.task_links(type);

alter table public.task_links enable row level security;

drop policy if exists task_links_select on public.task_links;
drop policy if exists task_links_insert on public.task_links;
drop policy if exists task_links_delete on public.task_links;

create policy task_links_select
on public.task_links
for select
to authenticated
using (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
);

create policy task_links_insert
on public.task_links
for insert
to authenticated
with check (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
);

create policy task_links_delete
on public.task_links
for delete
to authenticated
using (
  exists (
    select 1 from public.app_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
);

grant select, insert, delete on public.task_links to authenticated;
