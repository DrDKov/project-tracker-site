-- Workspace v20260529: enable Supabase Realtime for notification events.
-- Run in Supabase SQL Editor after task comments / mentions migration.
-- This makes the bell receive realtime events for:
-- - task assignment changes;
-- - task_assignees inserts/deletes;
-- - task_comments inserts with @mentions.

alter table public.tasks replica identity full;
alter table public.task_assignees replica identity full;
alter table public.task_comments replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime does not exist in this environment';
end $$;

do $$
begin
  alter publication supabase_realtime add table public.task_assignees;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime does not exist in this environment';
end $$;

do $$
begin
  alter publication supabase_realtime add table public.task_comments;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime does not exist in this environment';
end $$;
