// @ts-nocheck

/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */
/** @typedef {import('./taskCardModel.ts').TaskCardViewModel} TaskCardViewModel */

export const TASK_BOARD_MODES = /** @type {const} */ (['status', 'assignee', 'week']);

/**
 * @typedef {'status' | 'assignee' | 'week'} TaskBoardMode
 */

/**
 * @typedef {Object} TaskBoardFilters
 * @property {string=} query
 * @property {string[]=} projectIds
 * @property {string[]=} userIds
 * @property {'all' | 'range' | 'from' | 'exact' | 'overdue'=} dateMode
 * @property {string=} dateFrom
 * @property {string=} dateTo
 */

/**
 * @typedef {Object} TaskBoardColumn
 * @property {string} id
 * @property {string} title
 * @property {string} className
 * @property {Record<string, string>} data
 * @property {boolean=} today
 * @property {boolean=} weekend
 * @property {TaskCardViewModel[]} cards
 */

/**
 * @typedef {Object} TaskBoardViewModel
 * @property {TaskBoardMode} mode
 * @property {string} className
 * @property {string} dataMode
 * @property {string} weekLabel
 * @property {string} emptyLabel
 * @property {string} loadNote
 * @property {TaskBoardColumn[]} columns
 */

/**
 * @typedef {Object} CreateTaskBoardOptions
 * @property {Task[]} tasks
 * @property {AppUser[]} users
 * @property {TaskBoardMode | string} mode
 * @property {boolean} showDone
 * @property {TaskBoardFilters} filters
 * @property {string} weekStart
 * @property {string[]} statusColumns
 * @property {Record<string, string>} statusLabels
 * @property {boolean=} tasksLoading
 * @property {string=} taskError
 * @property {() => string} today
 * @property {(value: string | Date) => Date} D
 * @property {(date: string, days: number) => string} add
 * @property {(task: Task) => string[]} taskUserIds
 * @property {(task: Task, options?: { showStatus?: boolean }) => TaskCardViewModel} taskCard
 */

/** @param {TaskBoardMode | string | null | undefined} mode */
export function normalizeTaskBoardMode(mode) {
  return TASK_BOARD_MODES.includes(/** @type {TaskBoardMode} */ (mode)) ? /** @type {TaskBoardMode} */ (mode) : 'status';
}

/** @param {Task | null | undefined} task */
export function isTaskDone(task) {
  return task?.status === 'done';
}

/** @param {Task} task */
export function taskPrimaryDate(task) {
  return task.start_date || task.due_date || '';
}

/**
 * @param {Task} left
 * @param {Task} right
 */
export function compareTasksForBoard(left, right) {
  const doneDelta = Number(isTaskDone(left)) - Number(isTaskDone(right));
  if (doneDelta) return doneDelta;
  const orderDelta = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
  if (orderDelta) return orderDelta;
  return String(left.title || '').localeCompare(String(right.title || ''), 'ru');
}

/**
 * @param {(value: string | Date) => Date} D
 * @param {string} value
 */
export function getWeekStart(D, value) {
  const date = D(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dom = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dom}`;
}

/** @param {string} value */
export function formatBoardDateShort(value) {
  if (!value || value === '__none__') return '';
  const [, month, day] = String(value).split('-');
  return `${day}.${month}`;
}

/**
 * @param {Task} task
 * @param {string} date
 */
export function isTaskActiveOnDate(task, date) {
  const start = task.start_date || task.due_date;
  const due = task.due_date || task.start_date;
  if (!start && !due) return false;
  return String(start) <= date && date <= String(due);
}

/** @param {Task} task */
export function hasTaskDate(task) {
  return Boolean(task.start_date || task.due_date);
}

/**
 * @param {Task} task
 * @param {TaskBoardFilters} filters
 * @param {CreateTaskBoardOptions} options
 */
function matchesTask(task, filters, options) {
  const taskUsers = options.taskUserIds(task);
  const query = String(filters.query || '').trim().toLowerCase();
  const projectIds = filters.projectIds || ['all'];
  const userIds = filters.userIds || ['all'];

  if (!options.showDone && isTaskDone(task)) return false;
  if (!matchesDateFilter(task, filters, options.today())) return false;
  if (!projectIds.includes('all') && !projectIds.includes(String(task.project_id || ''))) return false;
  if (!userIds.includes('all') && !userIds.some((id) => taskUsers.includes(id))) return false;
  if (!query) return true;

  const haystack = [task.title, task.notes, task.description, task.project_id, taskUsers.join(' ')].join(' ').toLowerCase();
  return haystack.includes(query);
}

/**
 * @param {Task} task
 * @param {TaskBoardFilters} filters
 * @param {string} today
 */
export function matchesDateFilter(task, filters, today) {
  const mode = filters.dateMode || 'all';
  const from = filters.dateFrom || '';
  const to = filters.dateTo || '';

  if (mode === 'all') return true;
  if (mode === 'overdue') return Boolean(!isTaskDone(task) && task.due_date && task.due_date < today);
  if (mode === 'exact') return from ? isTaskActiveOnDate(task, from) : true;
  if (mode === 'from') {
    if (!from) return true;
    const end = task.due_date || task.start_date || '';
    return !end || end >= from;
  }
  if (mode === 'range') {
    if (!from && !to) return true;
    const start = task.start_date || task.due_date || '';
    const end = task.due_date || task.start_date || '';
    if (from && end && end < from) return false;
    if (to && start && start > to) return false;
    return true;
  }
  return true;
}

/**
 * @param {CreateTaskBoardOptions} options
 * @returns {TaskBoardViewModel}
 */
export function createTaskBoardViewModel(options) {
  const mode = normalizeTaskBoardMode(options.mode);
  const filteredTasks = options.tasks
    .filter((task) => matchesTask(task, options.filters, { ...options, mode }))
    .sort(compareTasksForBoard);

  const loadNote = options.tasksLoading
    ? 'Задачи загружаются отдельным безопасным запросом: узкий набор полей, увеличенный таймаут, повторная попытка…'
    : options.taskError
      ? `Задачи не обновились: ${options.taskError}. Проекты и остальные разделы не заблокированы.`
      : '';

  if (mode === 'status') {
    return {
      mode,
      className: 'kanban',
      dataMode: '',
      weekLabel: '',
      emptyLabel: 'Нет задач',
      loadNote,
      columns: options.statusColumns.map((status) => {
        const tasks = filteredTasks.filter((task) => task.status === status).sort(compareTasksForBoard);
        return {
          id: status,
          title: options.statusLabels[status] || status,
          className: 'col drop-col',
          data: { status },
          cards: tasks.map((task) => options.taskCard(task, { showStatus: false }))
        };
      })
    };
  }

  if (mode === 'assignee') {
    const userFilter = options.filters.userIds?.includes('all') ? null : new Set(options.filters.userIds || []);
    /** @type {TaskBoardColumn[]} */
    const columns = options.users
      .filter((user) => !userFilter || userFilter.has(user.id))
      .map((user) => ({
        id: user.id,
        title: user.display_name || user.email || 'Без имени',
        className: 'col assignee-col',
        data: { assigneeId: user.id },
        cards: []
      }));

    const unassigned = { id: '__none__', title: 'Не назначено', className: 'col assignee-col', data: { assigneeId: '__none__' }, cards: [] };
    filteredTasks.forEach((task) => {
      const ids = options.taskUserIds(task);
      let placed = false;
      ids.forEach((id) => {
        const column = columns.find((item) => item.id === id);
        if (column) {
          column.cards.push(options.taskCard(task, { showStatus: true }));
          placed = true;
        }
      });
      if (!placed && !userFilter) unassigned.cards.push(options.taskCard(task, { showStatus: true }));
    });

    return {
      mode,
      className: 'kanban assignee-mode',
      dataMode: 'assignee',
      weekLabel: '',
      emptyLabel: 'Нет задач',
      loadNote,
      columns: userFilter ? columns : columns.concat([unassigned])
    };
  }

  const weekStart = getWeekStart(options.D, options.weekStart || options.today());
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  /** @type {TaskBoardColumn[]} */
  const columns = labels.map((label, index) => {
    const date = options.add(weekStart, index);
    return {
      id: date,
      title: `${label}, ${formatBoardDateShort(date)}`,
      className: `col week-col ${date === options.today() ? 'today' : ''} ${index > 4 ? 'weekend' : ''}`.replace(/\s+/g, ' ').trim(),
      data: { date },
      today: date === options.today(),
      weekend: index > 4,
      cards: []
    };
  });
  const undated = { id: '__none__', title: 'Без даты', className: 'col week-col', data: { date: '__none__' }, cards: [] };

  filteredTasks.forEach((task) => {
    if (!hasTaskDate(task)) {
      undated.cards.push(options.taskCard(task, { showStatus: true }));
      return;
    }
    columns.forEach((column) => {
      if (isTaskActiveOnDate(task, column.id) && !column.cards.some((card) => card.id === task.id)) {
        column.cards.push(options.taskCard(task, { showStatus: true }));
      }
    });
  });

  return {
    mode,
    className: 'kanban week-mode',
    dataMode: 'week',
    weekLabel: `Неделя ${formatBoardDateShort(columns[0].id)}–${formatBoardDateShort(columns[6].id)}`,
    emptyLabel: 'Нет задач',
    loadNote,
    columns: columns.concat([undated])
  };
}
