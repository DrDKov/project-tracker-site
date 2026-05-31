-- Enable realtime payloads for the React workspace.
-- Run this migration in Supabase SQL editor / migrations if realtime changes are not reaching other open clients.

DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'projects',
    'tasks',
    'task_assignees',
    'task_subtasks',
    'task_comments',
    'project_messages',
    'material_templates',
    'material_folders',
    'material_files',
    'project_members',
    'app_users'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', table_name);

    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN undefined_object THEN
        RAISE NOTICE 'Publication supabase_realtime does not exist in this database';
      WHEN undefined_table THEN
        RAISE NOTICE 'Table public.% does not exist, skipped', table_name;
    END;
  END LOOP;
END $$;
