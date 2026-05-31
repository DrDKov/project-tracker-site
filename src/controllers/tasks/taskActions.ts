// @ts-nocheck
import type { AppState, Subtask, Task } from '../../types/entities';
import type { TaskRepository, TaskSaveInput } from '../../repositories';

export interface TaskFormInput extends TaskSaveInput {
  assigneeIds: string[];
}

export interface TaskActionControllerDeps {
  state: AppState;
  repository: TaskRepository;
  reload: () => Promise<unknown>;
  render: () => void;
  renderTasks: () => void;
  renderTimeline: () => void;
  byId: <T extends { id?: string }>(items: T[], id?: string | null) => T | undefined;
  subtasksForTask: (taskId: string) => Subtask[];
  currentView: () => string;
  currentUserId: () => string | null | undefined;
}

function cloneTask(task: Task | undefined): Task | null {
  return task ? { ...task } : null;
}

function restoreTask(task: Task | undefined, snapshot: Task | null): void {
  if (task && snapshot) Object.assign(task, snapshot);
}

function renderTimelineIfVisible(deps: TaskActionControllerDeps): void {
  if (deps.currentView() === 'timeline') deps.renderTimeline();
}

export function createTaskActionController(deps: TaskActionControllerDeps) {
  async function saveTask(input: TaskFormInput, options: { id?: string | null; createRecurring?: (row: TaskSaveInput, assigneeIds: string[]) => Promise<unknown> } = {}) {
    const id = options.id || null;
    const { assigneeIds, ...row } = input;
    if (!row.title?.trim()) throw new Error('Введите название задачи');
    if (!row.project_id) throw new Error('Выберите проект задачи');

    if (!id && options.createRecurring) {
      await options.createRecurring(row, assigneeIds);
      await deps.reload();
      return null;
    }

    const saved = await deps.repository.save(id, row);
    await deps.repository.replaceAssignees(saved.id, assigneeIds);
    await deps.reload();
    return saved;
  }

  async function toggleTask(id: string, done: boolean) {
    const task = deps.byId(deps.state.tasks || [], id);
    const snapshot = cloneTask(task);
    if (task) {
      task.status = done ? 'done' : 'in_progress';
      task.completed_at = done ? new Date().toISOString() : null;
      task.completed_by_id = done ? deps.currentUserId() || null : null;
      deps.renderTasks();
      renderTimelineIfVisible(deps);
    }
    try {
      await deps.repository.updateCompletion(id, done, deps.currentUserId());
    } catch (error) {
      restoreTask(task, snapshot);
      deps.renderTasks();
      renderTimelineIfVisible(deps);
      throw error;
    }
  }

  async function moveTask(id: string, status: string) {
    const task = deps.byId(deps.state.tasks || [], id);
    const snapshot = cloneTask(task);
    if (task) {
      task.status = status;
      if (status === 'done') {
        task.completed_at = new Date().toISOString();
        task.completed_by_id = deps.currentUserId() || null;
      } else {
        task.completed_at = null;
        task.completed_by_id = null;
      }
      deps.renderTasks();
      renderTimelineIfVisible(deps);
    }
    try {
      await deps.repository.updateStatus(id, status, deps.currentUserId());
    } catch (error) {
      restoreTask(task, snapshot);
      deps.renderTasks();
      renderTimelineIfVisible(deps);
      throw error;
    }
  }

  async function updateTaskTimeline(id: string, startDate: string | null, dueDate: string | null) {
    const task = deps.byId(deps.state.tasks || [], id);
    const snapshot = cloneTask(task);
    if (task) {
      task.start_date = startDate;
      task.due_date = dueDate;
      deps.renderTasks();
      renderTimelineIfVisible(deps);
    }
    try {
      await deps.repository.updateTimeline(id, startDate, dueDate);
    } catch (error) {
      restoreTask(task, snapshot);
      deps.renderTasks();
      renderTimelineIfVisible(deps);
      throw error;
    }
  }

  async function toggleFavorite(id: string) {
    const task = deps.byId(deps.state.tasks || [], id);
    if (!task) return;
    const previous = Boolean(task.is_favorite);
    task.is_favorite = !previous;
    if (!previous) task.sort_order = -Date.now();
    deps.renderTasks();
    renderTimelineIfVisible(deps);
    try {
      await deps.repository.setFavorite(id, !previous);
    } catch (error) {
      task.is_favorite = previous;
      deps.renderTasks();
      renderTimelineIfVisible(deps);
      throw error;
    }
  }

  async function addSubtask(taskId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return null;
    const row = await deps.repository.createSubtask({
      task_id: taskId,
      title: cleanTitle,
      created_by: deps.currentUserId() || undefined,
      sort_order: deps.subtasksForTask(taskId).length
    } as Partial<Subtask> & { task_id: string; title: string });
    deps.state.subtasks = [...(deps.state.subtasks || []), row];
    deps.render();
    return row;
  }

  async function toggleSubtask(id: string, done: boolean) {
    const subtask = deps.byId(deps.state.subtasks || [], id);
    if (subtask) {
      subtask.is_done = done;
      deps.render();
    }
    await deps.repository.updateSubtaskDone(id, done);
  }

  async function deleteSubtask(id: string) {
    await deps.repository.deleteSubtask(id);
    deps.state.subtasks = (deps.state.subtasks || []).filter((item) => item.id !== id);
    deps.render();
  }

  async function addComment(taskId: string, body: string) {
    const cleanBody = String(body || '').trim();
    if (!taskId || !cleanBody) return null;
    const row = await deps.repository.addComment({
      task_id: taskId,
      body: cleanBody,
      user_id: deps.currentUserId() || undefined,
      author_id: deps.currentUserId() || undefined
    });
    deps.state.taskComments = [...(deps.state.taskComments || []), row];
    deps.render();
    return row;
  }

  async function deleteComment(id: string) {
    if (!id) return null;
    await deps.repository.deleteComment(id);
    deps.state.taskComments = (deps.state.taskComments || []).filter((item) => item.id !== id);
    deps.render();
    return true;
  }

  return {
    saveTask,
    toggleTask,
    moveTask,
    updateTaskTimeline,
    toggleFavorite,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addComment,
    deleteComment
  };
}
