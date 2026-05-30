import type { TaskActionControllerDeps } from '../tasks/taskActions';
import { createTaskActionController } from '../tasks/taskActions';

export function createTimelineActionController(deps: TaskActionControllerDeps) {
  const taskActions = createTaskActionController(deps);
  return {
    updateTaskTimeline: taskActions.updateTaskTimeline
  };
}
