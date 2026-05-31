-- Force-enable Supabase Realtime for the core workspace tables used by task/project collaboration.
-- Execute this in Supabase SQL editor if the browser shows:
--   window.__workspaceRealtimeStatus === 'SUBSCRIBED'
--   window.__workspaceRealtimeLastEvent === undefined
-- This means the socket is connected, but the database is not publishing postgres_changes.

DO $$
DECLARE
  table_name text;
  table_reg regclass;
  tables text[] := ARRAY[
    'projects',
    'tasks',
    'task_assignees',
    'task_subtasks',
    'task_comments',
    'project_messages',
    'project_members',
    'app_users'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    table_reg := to_regclass(format('public.%I', table_name));

    IF table_reg IS NULL THEN
      RAISE NOTICE 'Realtime skipped: public.% does not exist', table_name;
      CONTINUE;
    END IF;

    -- Required so UPDATE/DELETE payloads contain enough data for client-side patching.
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', table_name);

    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      RAISE NOTICE 'Realtime enabled: public.%', table_name;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Realtime already enabled: public.%', table_name;
      WHEN undefined_object THEN
        RAISE EXCEPTION 'Publication supabase_realtime does not exist. Enable Realtime in Supabase first.';
    END;
  END LOOP;
END $$;

-- Diagnostic output: every listed table should appear here after the block above.
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN (
    'projects',
    'tasks',
    'task_assignees',
    'task_subtasks',
    'task_comments',
    'project_messages',
    'project_members',
    'app_users'
  )
ORDER BY tablename;
