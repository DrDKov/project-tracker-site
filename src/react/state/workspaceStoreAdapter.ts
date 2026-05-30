// @ts-nocheck
import type { AppState } from '../../types/entities';
import { navigateWorkspaceRoute } from '../../app/router/routeSync';
import { appStore } from '../../core/state/store';

const EMPTY_STATE = Object.freeze({}) as AppState;

export function getWorkspaceApp() { return null; }
export function getWorkspaceStore() { return appStore; }
export function getWorkspaceSnapshot(): AppState { return appStore.getState() || EMPTY_STATE; }
export function getServerWorkspaceSnapshot(): AppState { return EMPTY_STATE; }
export function subscribeWorkspace(onStoreChange: () => void) { return appStore.subscribe(onStoreChange); }

export function createWorkspaceStatusModel(state?: AppState | null) {
  return { title: state?.statusTitle || 'База подключена', text: state?.statusText || 'Проверяю текущую сессию...', loading: Boolean(state?.loading || state?.tasksLoading), taskError: state?.taskError || '', warnings: Array.isArray(state?.warnings) ? state.warnings : [] };
}

export function createWorkspaceDataModel(state?: AppState | null) {
  const projects = Array.isArray(state?.projects) ? state.projects : [];
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const users = Array.isArray(state?.users) ? state.users : [];
  const notifications = Array.isArray(state?.notifications) ? state.notifications : [];
  const materials = { templates: Array.isArray(state?.materialTemplates) ? state.materialTemplates : [], folders: Array.isArray(state?.materialFolders) ? state.materialFolders : [], files: Array.isArray(state?.materialFiles) ? state.materialFiles : [] };
  return { user: state?.user || null, profile: state?.profile || null, view: state?.view || 'overview', projects, tasks, users, notifications, materials, counts: { projects: projects.length, tasks: tasks.length, users: users.length, notifications: notifications.length, unreadNotifications: notifications.filter((item) => !item.is_read).length }, status: createWorkspaceStatusModel(state) };
}

export function createWorkspaceActionModel() {
  return { setView(view: string) { navigateWorkspaceRoute(view); }, load() { return null; }, render() {}, openProject() {}, openTask() {}, openUser() {}, openAccess() {}, toggleTask() {}, moveTask() {}, updateTaskTimeline() {} };
}

export function createReactWorkspaceModel(state?: AppState | null) { return { data: createWorkspaceDataModel(state), status: createWorkspaceStatusModel(state), actions: createWorkspaceActionModel() }; }
