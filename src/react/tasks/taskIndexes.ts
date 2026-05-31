// @ts-nocheck

/**
 * Build normalized indexes for the task board.
 *
 * The previous task board path repeatedly scanned global arrays from inside every card:
 * task assignees, subtasks, comments, projects and users. With many cards this becomes
 * O(tasks * relatedRows). These indexes make card/model building mostly O(tasks + relatedRows).
 */

function activeRows(items) {
  return (items || []).filter((item) => item && !item.deleted_at);
}

function ensureBucket(map, key) {
  const id = String(key || '');
  if (!map.has(id)) map.set(id, []);
  return map.get(id);
}

function sortSubtasks(items) {
  return (items || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export function buildTaskBoardIndexes(state) {
  const projectsById = new Map();
  const usersById = new Map();
  const assigneesByTaskId = new Map();
  const subtasksByTaskId = new Map();
  const commentsByTaskId = new Map();
  const taskUserIdsByTaskId = new Map();

  activeRows(state.projects || []).forEach((project) => {
    if (project?.id) projectsById.set(String(project.id), project);
  });

  (state.users || []).forEach((user) => {
    if (user?.id) usersById.set(String(user.id), user);
  });

  (state.assignees || []).forEach((assignee) => {
    if (!assignee?.task_id || !assignee?.user_id) return;
    ensureBucket(assigneesByTaskId, assignee.task_id).push(assignee);
    const taskId = String(assignee.task_id);
    if (!taskUserIdsByTaskId.has(taskId)) taskUserIdsByTaskId.set(taskId, new Set());
    taskUserIdsByTaskId.get(taskId).add(String(assignee.user_id));
  });

  activeRows(state.subtasks || []).forEach((subtask) => {
    if (!subtask?.task_id) return;
    ensureBucket(subtasksByTaskId, subtask.task_id).push(subtask);
  });
  subtasksByTaskId.forEach((items, taskId) => {
    subtasksByTaskId.set(taskId, sortSubtasks(items));
  });

  activeRows(state.taskComments || []).forEach((comment) => {
    if (!comment?.task_id) return;
    ensureBucket(commentsByTaskId, comment.task_id).push(comment);
  });

  activeRows(state.tasks || []).forEach((task) => {
    if (!task?.id || !task.assignee_id) return;
    const taskId = String(task.id);
    if (!taskUserIdsByTaskId.has(taskId)) taskUserIdsByTaskId.set(taskId, new Set());
    taskUserIdsByTaskId.get(taskId).add(String(task.assignee_id));
  });

  return {
    projectsById,
    usersById,
    assigneesByTaskId,
    subtasksByTaskId,
    commentsByTaskId,
    taskUserIdsByTaskId,
    projectName(projectId) {
      const project = projectsById.get(String(projectId || ''));
      return project?.name || '—';
    },
    projectColor(projectId) {
      const project = projectsById.get(String(projectId || ''));
      return project?.color || '#64748b';
    },
    userName(userId) {
      const user = usersById.get(String(userId || ''));
      return user?.display_name || user?.email || '—';
    },
    taskUserIds(task) {
      const ids = taskUserIdsByTaskId.get(String(task?.id || ''));
      return ids ? Array.from(ids) : [];
    },
    subtasksForTask(taskId) {
      return subtasksByTaskId.get(String(taskId || '')) || [];
    },
    commentsForTask(taskId) {
      return commentsByTaskId.get(String(taskId || '')) || [];
    },
    commentCount(taskId) {
      return (commentsByTaskId.get(String(taskId || '')) || []).length;
    }
  };
}
