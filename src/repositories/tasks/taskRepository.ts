import type { Subtask, Task, TaskAssignee, TaskComment } from '../../types/entities';
import type { SupabaseClientLike } from '../../types/supabase';
import { assertRepositoryClient, repositoryCall } from '../repositoryError';
import {
  addTaskCommentRecord,
  createSubtaskRecord,
  deleteSubtaskRecord,
  deleteTaskCommentRecord,
  fetchTasksPaged,
  replaceTaskAssignees,
  saveTaskRecord,
  setTaskFavorite,
  updateSubtaskDone,
  updateTaskCompletion,
  updateTaskDateRange,
  updateTaskStatus,
  updateTaskTimelineDates
} from '../../services/tasks.service.js';

export interface TaskSaveInput extends Partial<Task> {
  title: string;
  project_id: string;
}

export interface TaskRepository {
  listPaged(options?: { page?: number; max?: number; timeoutMs?: number; onProgress?: (count: number) => void }): Promise<Task[]>;
  save(id: string | null, row: TaskSaveInput): Promise<Task>;
  replaceAssignees(taskId: string, userIds: string[]): Promise<TaskAssignee[]>;
  setFavorite(taskId: string, favorite: boolean): Promise<unknown>;
  updateCompletion(taskId: string, done: boolean, userId?: string | null): Promise<unknown>;
  updateStatus(taskId: string, status: string, userId?: string | null): Promise<unknown>;
  updateTimeline(taskId: string, startDate: string | null, dueDate: string | null): Promise<unknown>;
  updateDateRange(taskId: string, patch: Partial<Pick<Task, 'start_date' | 'due_date' | 'start_time' | 'end_time' | 'duration_minutes' | 'is_all_day'>>): Promise<unknown>;
  createSubtask(row: Partial<Subtask> & { task_id: string; title: string }): Promise<Subtask>;
  updateSubtaskDone(id: string, done: boolean): Promise<unknown>;
  deleteSubtask(id: string): Promise<unknown>;
  addComment(row: Partial<TaskComment> & { task_id: string; body: string }): Promise<TaskComment>;
  deleteComment(id: string): Promise<unknown>;
}

const DOMAIN = 'tasks';

export function createTaskRepository(client: SupabaseClientLike): TaskRepository {
  assertRepositoryClient(client, DOMAIN);
  return {
    listPaged: (options = {}) => repositoryCall(DOMAIN, 'listPaged', () => fetchTasksPaged(client, options) as Promise<Task[]>),
    save: (id, row) => repositoryCall(DOMAIN, 'save', () => saveTaskRecord(client, id, row) as Promise<Task>),
    replaceAssignees: (taskId, userIds) => repositoryCall(DOMAIN, 'replaceAssignees', () => replaceTaskAssignees(client, taskId, userIds) as Promise<TaskAssignee[]>),
    setFavorite: (taskId, favorite) => repositoryCall(DOMAIN, 'setFavorite', () => setTaskFavorite(client, taskId, favorite)),
    updateCompletion: (taskId, done, userId = null) => repositoryCall(DOMAIN, 'updateCompletion', () => updateTaskCompletion(client, taskId, done, userId)),
    updateStatus: (taskId, status, userId = null) => repositoryCall(DOMAIN, 'updateStatus', () => updateTaskStatus(client, taskId, status, userId)),
    updateTimeline: (taskId, startDate, dueDate) => repositoryCall(DOMAIN, 'updateTimeline', () => updateTaskTimelineDates(client, taskId, startDate, dueDate)),
    updateDateRange: (taskId, patch) => repositoryCall(DOMAIN, 'updateDateRange', () => updateTaskDateRange(client, taskId, patch)),
    createSubtask: (row) => repositoryCall(DOMAIN, 'createSubtask', () => createSubtaskRecord(client, row) as Promise<Subtask>),
    updateSubtaskDone: (id, done) => repositoryCall(DOMAIN, 'updateSubtaskDone', () => updateSubtaskDone(client, id, done)),
    deleteSubtask: (id) => repositoryCall(DOMAIN, 'deleteSubtask', () => deleteSubtaskRecord(client, id)),
    addComment: (row) => repositoryCall(DOMAIN, 'addComment', () => addTaskCommentRecord(client, row) as Promise<TaskComment>),
    deleteComment: (id) => repositoryCall(DOMAIN, 'deleteComment', () => deleteTaskCommentRecord(client, id))
  };
}
