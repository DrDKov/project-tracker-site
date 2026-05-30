// @ts-check
/** @typedef {import('../../types/entities.js').AppState} AppState */
import { isWorkspaceAdmin, isWorkspaceOwner, getWorkspacePermissionSnapshot } from '../permissions/index.js';

/** @param {AppState} state */
export const selectAuthUser = (state) => state.user || null;
/** @param {AppState} state */
export const selectProfile = (state) => state.profile || null;
/** @param {AppState} state */
export const selectView = (state) => state.view || 'overview';
/** @param {AppState} state */
export const selectProjects = (state) => Array.isArray(state.projects) ? state.projects : [];
/** @param {AppState} state */
export const selectTasks = (state) => Array.isArray(state.tasks) ? state.tasks : [];
/** @param {AppState} state */
export const selectUsers = (state) => Array.isArray(state.users) ? state.users : [];
/** @param {AppState} state */
export const selectMembers = (state) => Array.isArray(state.members) ? state.members : [];
/** @param {AppState} state */
export const selectTaskAssignees = (state) => Array.isArray(state.assignees) ? state.assignees : [];
/** @param {AppState} state */
export const selectSubtasks = (state) => Array.isArray(state.subtasks) ? state.subtasks : [];
/** @param {AppState} state */
export const selectTaskComments = (state) => Array.isArray(state.taskComments) ? state.taskComments : [];
/** @param {AppState} state */
export const selectMessages = (state) => Array.isArray(state.messages) ? state.messages : [];
/** @param {AppState} state */
export const selectNotifications = (state) => Array.isArray(state.notifications) ? state.notifications : [];
/** @param {AppState} state */
export const selectIsOwner = (state) => isWorkspaceOwner(state.profile);
/** @param {AppState} state */
export const selectIsAdmin = (state) => isWorkspaceAdmin(state.profile);
/** @param {AppState} state */
export const selectPermissions = (state) => getWorkspacePermissionSnapshot(state.profile, selectProjects(state), selectMembers(state));
