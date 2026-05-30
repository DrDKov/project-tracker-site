import React from 'react';
import { EmptyState } from '../../shared/ui';
import { ProjectCard } from '../projects/ProjectCard';
import { TaskCardContent } from '../tasks/TaskCard';
import type { DashboardOverviewModel, TaskCardViewModel } from './dashboardModel';

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

function TaskCardShell({ card, actions = {} }: { card: TaskCardViewModel; actions?: TaskCardActions }) {
  return (
    <article
      className={card.rootClassName}
      draggable="true"
      data-task-id={card.id}
      data-react-task-card-root={card.id}
      data-task-card-show-status={card.showStatus ? '1' : '0'}
      style={card.rootStyle as React.CSSProperties}
    >
      <TaskCardContent model={card} actions={actions} />
    </article>
  );
}

export function DashboardProjects({ model, actions = {} }: { model: DashboardOverviewModel; actions?: ProjectCardActions }) {
  if (!model.projects.length) return <EmptyState title={model.emptyProjectsLabel} />;
  return <>{model.projects.map((project) => <ProjectCard key={project.id} project={project} actions={actions} />)}</>;
}

export function DashboardFocusTasks({ model, actions = {} }: { model: DashboardOverviewModel; actions?: TaskCardActions }) {
  if (!model.focusTasks.length) return <EmptyState title={model.emptyTasksLabel} />;
  return <>{model.focusTasks.map((task) => <TaskCardShell key={task.id} card={task} actions={actions} />)}</>;
}
