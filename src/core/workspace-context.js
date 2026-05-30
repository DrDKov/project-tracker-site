// @ts-check
import {
  selectAuthUser,
  selectProfile,
  selectProjects,
  selectTasks,
  selectUsers,
  selectPermissions
} from './state/selectors.js';

export function workspaceApp() {
  return null;
}

export function workspaceStore() {
  return window.appStore || null;
}

export function workspaceState() {
  const store = workspaceStore();
  if (store && typeof store.getState === 'function') return store.getState();
  return null;
}

export function workspaceClient() {
  try {
    const state = workspaceState();
    return (state && state.sb) || window.sb || null;
  } catch { return null; }
}

export function currentProfile() {
  try {
    const state = workspaceState();
    return state ? selectProfile(state) : null;
  } catch { return null; }
}

export function currentAuthUser() {
  try {
    const state = workspaceState();
    return state ? selectAuthUser(state) : null;
  } catch { return null; }
}

export function currentPermissions() {
  try {
    const state = workspaceState();
    return state ? selectPermissions(state) : null;
  } catch { return null; }
}

export function taskList() {
  try {
    const state = workspaceState();
    return state ? selectTasks(state) : [];
  } catch { return []; }
}

export function userList() {
  try {
    const state = workspaceState();
    return state ? selectUsers(state) : [];
  } catch { return []; }
}

export function projectList() {
  try {
    const state = workspaceState();
    return state ? selectProjects(state) : [];
  } catch { return []; }
}

export function openTaskById(taskId) {
  try {
    window.location.hash = '#/tasks';
    window.dispatchEvent(new CustomEvent('workspace:open-task', { detail: { taskId } }));
  } catch {}
}
