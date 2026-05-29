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
  return window.__WorkspaceApp || null;
}

export function workspaceStore() {
  const app = workspaceApp();
  return app && app.store ? app.store : (window.appStore || null);
}

export function workspaceState() {
  const store = workspaceStore();
  if (store && typeof store.getState === 'function') return store.getState();
  const app = workspaceApp();
  if (app && app.state) return app.state;
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
    return state ? selectProfile(state) : (window.currentProfile || null);
  } catch { return null; }
}

export function currentAuthUser() {
  try {
    const state = workspaceState();
    return state ? selectAuthUser(state) : (window.currentAuth || null);
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
    return state ? selectTasks(state) : (Array.isArray(window.tasks) ? window.tasks : []);
  } catch { return []; }
}

export function userList() {
  try {
    const state = workspaceState();
    return state ? selectUsers(state) : (Array.isArray(window.users) ? window.users : []);
  } catch { return []; }
}

export function projectList() {
  try {
    const state = workspaceState();
    return state ? selectProjects(state) : (Array.isArray(window.projects) ? window.projects : []);
  } catch { return []; }
}

export function openTaskById(taskId) {
  const app = workspaceApp();
  if (app && typeof app.openTask === 'function') {
    app.openTask(taskId);
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.hidden = true;
  button.dataset.action = 'open-task';
  button.dataset.id = taskId;
  document.body.appendChild(button);
  button.click();
  setTimeout(() => button.remove(), 50);
}
