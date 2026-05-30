import type { AppState, AppUser, NotificationRecord, Project, Task } from '../../types/entities';

export const selectWorkspaceView = (state: AppState): string => state.view || 'overview';
export const selectWorkspaceProjects = (state: AppState): Project[] => Array.isArray(state.projects) ? state.projects : [];
export const selectWorkspaceTasks = (state: AppState): Task[] => Array.isArray(state.tasks) ? state.tasks : [];
export const selectWorkspaceUsers = (state: AppState): AppUser[] => Array.isArray(state.users) ? state.users : [];
export const selectWorkspaceNotifications = (state: AppState): NotificationRecord[] => Array.isArray(state.notifications) ? state.notifications : [];

export interface WorkspaceStatusModel {
  title: string;
  text: string;
  loading: boolean;
  taskError: string;
  warnings: string[];
}

export const selectWorkspaceStatus = (state: AppState): WorkspaceStatusModel => ({
  title: state.statusTitle || 'База подключена',
  text: state.statusText || 'Проверяю текущую сессию...',
  loading: Boolean(state.loading || state.tasksLoading),
  taskError: state.taskError || '',
  warnings: Array.isArray(state.warnings) ? state.warnings : []
});
