// @ts-nocheck
import { createWorkspaceDataModel, createWorkspaceStatusModel } from '../state/workspaceStoreAdapter.ts';

/** @typedef {import('../../types/entities.js').AppState} AppState */

/**
 * Query-like pure projection for React components. This is intentionally not a
 * second cache. The legacy loader remains the single writer; React receives
 * typed projections from the canonical appStore.
 *
 * @param {AppState | null | undefined} state
 */
export function getWorkspaceDataLayer(state) {
  return {
    workspace: createWorkspaceDataModel(state),
    status: createWorkspaceStatusModel(state),
    loaded: Boolean(state?.profile),
    hasClient: Boolean(state?.sb)
  };
}

/**
 * @param {AppState | null | undefined} state
 */
export function getWorkspaceEntityIndexes(state) {
  const projects = Array.isArray(state?.projects) ? state.projects : [];
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const users = Array.isArray(state?.users) ? state.users : [];
  return {
    projectsById: new Map(projects.map((item) => [item.id, item])),
    tasksById: new Map(tasks.map((item) => [item.id, item])),
    usersById: new Map(users.map((item) => [item.id, item]))
  };
}
