-- Normalize task time flags so timed tasks are never treated as all-day items.
-- A task with start_time must be rendered in the timed timeline grid.

CREATE OR REPLACE FUNCTION public.normalize_task_time_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_time IS NOT NULL THEN
    NEW.is_all_day := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_task_time_flags ON public.tasks;
CREATE TRIGGER trg_normalize_task_time_flags
BEFORE INSERT OR UPDATE OF start_time, is_all_day ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.normalize_task_time_flags();

UPDATE public.tasks
SET is_all_day = false,
    updated_at = now()
WHERE deleted_at IS NULL
  AND is_all_day IS TRUE
  AND start_time IS NOT NULL;
