import React from 'react';
import { renderReactIsland } from '../core/createReactIsland';
import { DashboardFocusTasks, DashboardProjects } from './DashboardOverview';
import type { DashboardOverviewModel } from './dashboardModel';

type ProjectCardActions = {
  openProject?: (projectId: string) => void | Promise<unknown>;
  createTaskForProject?: (projectId: string) => void | Promise<unknown>;
  openAccess?: (projectId: string) => void | Promise<unknown>;
  deleteProject?: (projectId: string) => void | Promise<unknown>;
};

type TaskCardActions = {
  openTask?: (taskId: string) => void | Promise<unknown>;
  deleteTask?: (taskId: string) => void | Promise<unknown>;
  toggleTask?: (taskId: string, done: boolean) => void | Promise<unknown>;
  toggleTaskFavorite?: (taskId: string) => void | Promise<unknown>;
  addSubtask?: (taskId: string, title: string) => void | Promise<unknown>;
  toggleSubtask?: (subtaskId: string, done: boolean) => void | Promise<unknown>;
  deleteSubtask?: (subtaskId: string) => void | Promise<unknown>;
};

export interface MountDashboardOverviewOptions {
  projectsContainer?: HTMLElement | null;
  tasksContainer?: HTMLElement | null;
  model: DashboardOverviewModel;
  actions?: {
    projectActions?: ProjectCardActions;
    taskActions?: TaskCardActions;
  };
}

export function mountDashboardOverview({ projectsContainer, tasksContainer, model, actions = {} }: MountDashboardOverviewOptions) {
  if (projectsContainer) renderReactIsland(projectsContainer, <DashboardProjects model={model} actions={actions.projectActions || {}} />);
  if (tasksContainer) renderReactIsland(tasksContainer, <DashboardFocusTasks model={model} actions={actions.taskActions || {}} />);
}
