// @ts-nocheck

/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').Subtask} Subtask */

/**
 * @typedef {Object} TaskCardDeps
 * @property {(value?: string | null) => string} fmt
 * @property {(value?: string | null) => string} dt
 * @property {(hex: string | undefined | null, alpha: number) => string} rgba
 * @property {(projectId?: string | null) => string} pcolor
 * @property {(projectId?: string | null) => string} pname
 * @property {(userId?: string | null) => string} uname
 * @property {(task: Task) => string[]} tids
 * @property {(taskId: string) => Subtask[]} subs
 * @property {() => string} today
 * @property {Record<string, string>} PR
 * @property {Record<string, string>=} ST
 * @property {(taskId: string) => unknown[]} taskCommentList
 */

/**
 * @typedef {Object} TaskCardOptions
 * @property {boolean=} showStatus
 */

/**
 * @typedef {Object} TaskCardSubtaskView
 * @property {string} id
 * @property {string} title
 * @property {boolean} isDone
 */

/**
 * @typedef {Object} TaskCardViewModel
 * @property {string} id
 * @property {string} title
 * @property {string} projectName
 * @property {string} priorityLabel
 * @property {string} statusLabel
 * @property {boolean} showStatus
 * @property {boolean} isDone
 * @property {boolean} isOverdue
 * @property {boolean} isFavorite
 * @property {boolean} isRecurring
 * @property {boolean} hasNotes
 * @property {string} dateRange
 * @property {string} assigneesLabel
 * @property {string} accentColor
 * @property {string} rootClassName
 * @property {Record<string, string>} rootStyle
 * @property {{visible:boolean,date:string,user:string}} doneMeta
 * @property {{items:TaskCardSubtaskView[],done:number,total:number,percent:number}} subtasks
 * @property {number} commentCount
 */

/** @param {Task | null | undefined} task */
export function isTaskCardFavorite(task) {
  return Boolean(task && task.is_favorite);
}

/**
 * @param {Task} task
 * @param {TaskCardDeps} deps
 * @param {TaskCardOptions} [options]
 * @returns {TaskCardViewModel}
 */
export function createTaskCardViewModel(task, deps, options = {}) {
  const taskId = String(task.id || '');
  const isDone = task.status === 'done';
  const isOverdue = Boolean(!isDone && task.due_date && task.due_date < deps.today());
  const assigneesLabel = deps.tids(task).map(deps.uname).filter(Boolean).join(', ') || 'Не назначено';
  const accentColor = deps.pcolor(task.project_id);
  const subtaskItems = deps.subs(taskId).map((item) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    isDone: Boolean(item.is_done)
  }));
  const subtaskDone = subtaskItems.filter((item) => item.isDone).length;
  const userId = task.completed_by_id || task.completed_by || task.closed_by_id || task.updated_by || null;

  return {
    id: taskId,
    title: String(task.title || 'Без названия'),
    projectName: deps.pname(task.project_id),
    priorityLabel: deps.PR[task.priority || ''] || task.priority || '—',
    statusLabel: deps.ST?.[task.status || ''] || task.status || '—',
    showStatus: Boolean(options.showStatus),
    isDone,
    isOverdue,
    isFavorite: isTaskCardFavorite(task),
    isRecurring: Boolean(task.recurrence_rule_id),
    hasNotes: Boolean(task.notes),
    dateRange: `${deps.fmt(task.start_date)} → ${deps.fmt(task.due_date)}`,
    assigneesLabel,
    accentColor,
    rootClassName: `task-card wk-task ${isDone ? 'wk-complete' : ''} ${isOverdue ? 'overdue' : ''}`.replace(/\s+/g, ' ').trim(),
    rootStyle: {
      '--accent': accentColor,
      '--bg': deps.rgba(accentColor, 0.12),
      '--bd': deps.rgba(accentColor, 0.34)
    },
    doneMeta: {
      visible: isDone,
      date: deps.dt(task.completed_at || task.updated_at),
      user: userId ? deps.uname(userId) : '—'
    },
    subtasks: {
      items: subtaskItems,
      done: subtaskDone,
      total: subtaskItems.length,
      percent: subtaskItems.length ? Math.round((subtaskDone / subtaskItems.length) * 100) : 0
    },
    commentCount: deps.taskCommentList(taskId).length
  };
}

/**
 * @param {TaskCardViewModel} model
 * @returns {string}
 */
export function createTaskCardRootStyle(model) {
  return `--accent:${model.rootStyle['--accent']};--bg:${model.rootStyle['--bg']};--bd:${model.rootStyle['--bd']};`;
}
