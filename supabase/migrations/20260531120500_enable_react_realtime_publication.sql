-- Enable realtime payloads for the React workspace.
-- Run this migration in Supabase SQL editor / migrations if realtime changes are not reaching other open clients.
-- The migration is intentionally tolerant: older databases may not have every table yet.

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
    'workspace_templates',
    'material_folders',
    'material_files',
    'project_members',
    'app_users'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    table_reg := to_regclass(format('public.%I', table_name));

    IF table_reg IS NULL THEN
      RAISE NOTICE 'Table public.% does not exist, skipped', table_name;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', table_name);

    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN undefined_object THEN
        RAISE NOTICE 'Publication supabase_realtime does not exist in this database';
    END;
  END LOOP;
END $$;
