// @ts-nocheck

/** @typedef {import('../../types/entities.js').Project} Project */
/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */

/**
 * @typedef {Object} ProjectFilters
 * @property {string=} query
 * @property {string[]=} statuses
 * @property {string[]=} ownerIds
 */

/**
 * @typedef {Object} ProjectCardViewModel
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} nextStep
 * @property {string} ownerName
 * @property {string} status
 * @property {string} statusLabel
 * @property {string} priority
 * @property {string} priorityLabel
 * @property {string} startDate
 * @property {string} deadline
 * @property {string} color
 * @property {number} totalTasks
 * @property {number} doneTasks
 * @property {number} progress
 * @property {string} rootClassName
 * @property {Record<string, string>} rootStyle
 */

/**
 * @typedef {Object} ProjectsPageViewModel
 * @property {ProjectFilters} filters
 * @property {ProjectCardViewModel[]} projects
 * @property {number} total
 * @property {number} visible
 * @property {string} emptyLabel
 */

/**
 * @typedef {Object} CreateProjectsOptions
 * @property {Project[]} projects
 * @property {Task[]} tasks
 * @property {AppUser[]} users
 * @property {ProjectFilters} filters
 * @property {Record<string, string>} statusLabels
 * @property {Record<string, string>} priorityLabels
 * @property {(value?: string | null) => string} fmt
 * @property {(hex: string | undefined | null, alpha: number) => string} rgba
 */

/** @param {string[] | undefined} values */
function anySelected(values) {
  return !values || values.length === 0 || values.includes('all');
}

/**
 * @param {AppUser[]} users
 * @param {string | null | undefined} userId
 */
export function projectOwnerName(users, userId) {
  if (!userId) return '—';
  const user = users.find((item) => item.id === userId);
  return user?.display_name || user?.email || '—';
}

/**
 * @param {Task[]} tasks
 * @param {string} projectId
 */
export function projectTaskStats(tasks, projectId) {
  const list = tasks.filter((task) => task.project_id === projectId && !task.deleted_at);
  const done = list.filter((task) => task.status === 'done').length;
  const progress = Math.round((done || 0) / Math.max(1, list.length) * 100);
  return { total: list.length, done, progress };
}

/**
 * @param {Project} project
 * @param {CreateProjectsOptions} options
 * @returns {ProjectCardViewModel}
 */
export function createProjectCardViewModel(project, options) {
  const color = project.color || '#64748b';
  const stats = projectTaskStats(options.tasks, project.id);
  return {
    id: project.id,
    name: project.name || 'Без названия',
    description: project.description || 'Без описания',
    nextStep: project.next_step || '—',
    ownerName: projectOwnerName(options.users, project.owner_id),
    status: project.status || '',
    statusLabel: options.statusLabels[project.status || ''] || project.status || '—',
    priority: project.priority || '',
    priorityLabel: options.priorityLabels[project.priority || ''] || project.priority || '—',
    startDate: options.fmt(project.start_date || ''),
    deadline: options.fmt(project.deadline || ''),
    color,
    totalTasks: stats.total,
    doneTasks: stats.done,
    progress: stats.progress,
    rootClassName: 'project-card react-project-card',
    rootStyle: {
      '--project-bg': options.rgba(color, 0.12),
      '--project-color': color,
      borderTopColor: color
    }
  };
}

/**
 * @param {Project} project
 * @param {ProjectFilters} filters
 */
export function matchesProjectFilters(project, filters) {
  if (project.deleted_at) return false;
  const statuses = filters.statuses || ['all'];
  const owners = filters.ownerIds || ['all'];
  const query = String(filters.query || '').trim().toLowerCase();

  if (!anySelected(statuses) && !statuses.includes(String(project.status || ''))) return false;
  if (!anySelected(owners) && !owners.includes(String(project.owner_id || ''))) return false;
  if (!query) return true;

  const haystack = [project.name, project.description, project.next_step, project.status, project.priority, project.owner_id]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * @param {CreateProjectsOptions} options
 * @returns {ProjectsPageViewModel}
 */
export function createProjectsPageViewModel(options) {
  const filtered = options.projects
    .filter((project) => matchesProjectFilters(project, options.filters))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'ru'));

  return {
    filters: options.filters,
    projects: filtered.map((project) => createProjectCardViewModel(project, options)),
    total: options.projects.filter((project) => !project.deleted_at).length,
    visible: filtered.length,
    emptyLabel: options.projects.length ? 'Нет проектов по выбранным фильтрам' : 'Нет проектов'
  };
}
