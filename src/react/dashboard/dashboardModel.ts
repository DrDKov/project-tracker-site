import { createProjectCardViewModel } from '../projects/projectModel';
import type { Project, Task, AppUser } from '../../types/entities';
export type ProjectCardViewModel = ReturnType<typeof createProjectCardViewModel>;
export type TaskCardViewModel = Record<string, any>;

export interface DashboardOverviewOptions {
  projects: Project[];
  tasks: Task[];
  users: AppUser[];
  statusLabels: Record<string, string>;
  priorityLabels: Record<string, string>;
  fmt: (value?: string | null) => string;
  rgba: (hex: string | undefined | null, alpha: number) => string;
  taskCard: (task: Task, options?: { showStatus?: boolean }) => Record<string, any>;
  projectLimit?: number;
  taskLimit?: number;
}

export interface DashboardOverviewModel {
  projects: ProjectCardViewModel[];
  focusTasks: TaskCardViewModel[];
  projectTotal: number;
  openTaskTotal: number;
  emptyProjectsLabel: string;
  emptyTasksLabel: string;
}

function isActiveProject(project: Project): boolean {
  return !project.deleted_at;
}

function isOpenTask(task: Task): boolean {
  return !task.deleted_at && task.status !== 'done';
}

export function createDashboardOverviewModel(options: DashboardOverviewOptions): DashboardOverviewModel {
  const projectLimit = Math.max(1, options.projectLimit ?? 8);
  const taskLimit = Math.max(1, options.taskLimit ?? 8);
  const projects = (options.projects || [])
    .filter(isActiveProject)
    .slice(0, projectLimit)
    .map((project) => createProjectCardViewModel(project, {
      projects: options.projects,
      tasks: options.tasks,
      users: options.users,
      filters: {},
      statusLabels: options.statusLabels,
      priorityLabels: options.priorityLabels,
      fmt: options.fmt,
      rgba: options.rgba
    }));

  const focusTasks = (options.tasks || [])
    .filter(isOpenTask)
    .slice(0, taskLimit)
    .map((task) => options.taskCard(task, { showStatus: true }));

  return {
    projects,
    focusTasks,
    projectTotal: (options.projects || []).filter(isActiveProject).length,
    openTaskTotal: (options.tasks || []).filter(isOpenTask).length,
    emptyProjectsLabel: 'Нет загруженных проектов',
    emptyTasksLabel: 'Нет открытых задач'
  };
}
