// @ts-nocheck

/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').Project} Project */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */

export const TIMELINE_DEFAULTS = Object.freeze({
  startHour: 6,
  endHour: 22,
  slotMinutes: 30,
  defaultDurationMinutes: 60,
  pixelsPerMinute: 1.1,
  labelOffsetMinutes: 60
});

/**
 * @typedef {Object} TimelineFilters
 * @property {string=} query
 * @property {string=} projectId
 * @property {string=} userId
 * @property {string=} status
 * @property {string=} priority
 * @property {boolean=} showDone
 */

/**
 * @typedef {Object} TimelineEventModel
 * @property {string} id
 * @property {string} taskId
 * @property {string} title
 * @property {string} projectName
 * @property {string} timeLabel
 * @property {boolean} done
 * @property {boolean} favorite
 * @property {boolean} recurring
 * @property {boolean} autoPlaced
 * @property {boolean} allDay
 * @property {Record<string, string | number>} style
 */

/**
 * @typedef {Object} TimelineDayModel
 * @property {string} date
 * @property {string} label
 * @property {boolean} today
 * @property {TimelineEventModel[]} timedEvents
 * @property {TimelineEventModel[]} allDayEvents
 * @property {number} overflowCount
 * @property {number|null} nowTop
 */

/**
 * @typedef {Object} TimelinePageModel
 * @property {TimelineFilters} filters
 * @property {string} weekLabel
 * @property {number} gridHeight
 * @property {number[]} hours
 * @property {Array<{hour:number, top:number, labelTop:number, label:string}>} hourLabels
 * @property {Array<{value:string,label:string}>} projectOptions
 * @property {Array<{value:string,label:string}>} userOptions
 * @property {Array<{value:string,label:string}>} statusOptions
 * @property {Array<{value:string,label:string}>} priorityOptions
 * @property {TimelineDayModel[]} days
 */

/** @param {string | Date} value */
export function toDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

/** @param {Date} date */
export function toYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} date
 * @param {number} days
 */
export function addDays(date, days) {
  const d = toDate(date);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

/** @param {string | Date} value */
export function getWeekStart(value) {
  const date = toDate(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toYmd(date);
}

/** @param {string} value */
export function formatShortDate(value) {
  if (!value) return '';
  const [, month, day] = String(value).slice(0, 10).split('-');
  return `${day}.${month}`;
}

/** @param {string | null | undefined} value */
export function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  return Number.isFinite(hours) ? hours * 60 + (Number.isFinite(minutes) ? minutes : 0) : null;
}

/** @param {number} minutes */
export function minutesToTime(minutes) {
  const safe = Math.max(0, Math.min(1439, Math.round(minutes)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * @param {Task} task
 * @param {number} defaultDurationMinutes
 */
export function taskDurationMinutes(task, defaultDurationMinutes = TIMELINE_DEFAULTS.defaultDurationMinutes) {
  const start = timeToMinutes(/** @type {any} */ (task).start_time);
  const end = timeToMinutes(/** @type {any} */ (task).end_time);
  if (start != null && end != null && end > start) return end - start;
  const raw = Number(/** @type {any} */ (task).duration_minutes);
  return raw > 0 ? raw : defaultDurationMinutes;
}

/**
 * @param {{a:number,b:number}} left
 * @param {{a:number,b:number}} right
 */
export function overlaps(left, right) {
  return left.a < right.b && right.a < left.b;
}

/**
 * @param {Array<{a:number,b:number,l?:number,n?:number}>} events
 */
export function assignLanes(events) {
  const sorted = events.slice().sort((a, b) => a.a - b.a || a.b - b.b);
  /** @type {number[]} */
  const lanes = [];
  sorted.forEach((event) => {
    let index = lanes.findIndex((value) => value <= event.a);
    if (index < 0) {
      index = lanes.length;
      lanes.push(event.b);
    } else {
      lanes[index] = event.b;
    }
    event.l = index;
    event.n = Math.max(1, lanes.length);
  });
  sorted.forEach((event) => { event.n = Math.max(event.n || 1, lanes.length); });
  return sorted;
}

/**
 * @param {Task} task
 * @param {string} date
 */
export function isTaskInDay(task, date) {
  const start = task.start_date || task.due_date || /** @type {any} */ (task).recurrence_date;
  const due = task.due_date || task.start_date || /** @type {any} */ (task).recurrence_date;
  return Boolean((start || due) && String(start) <= date && date <= String(due));
}

/**
 * @param {Task} task
 * @param {TimelineFilters} filters
 * @param {{taskUserIds:(task:Task)=>string[], projectName:(id?:string|null)=>string}} helpers
 */
export function matchesTimelineTask(task, filters, helpers) {
  if (task.deleted_at) return false;
  if (!filters.showDone && task.status === 'done') return false;
  if (filters.projectId && filters.projectId !== 'all' && task.project_id !== filters.projectId) return false;
  if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false;
  if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) return false;
  const users = helpers.taskUserIds(task);
  if (filters.userId && filters.userId !== 'all' && !users.includes(filters.userId)) return false;
  const query = String(filters.query || '').trim().toLowerCase();
  if (!query) return true;
  const haystack = [task.title, task.notes, task.description, helpers.projectName(task.project_id), users.join(' ')].join(' ').toLowerCase();
  return haystack.includes(query);
}

/**
 * @param {Task[]} tasks
 * @param {Array<{task:Task,a:number,b:number}>} timed
 * @param {{startHour:number,endHour:number,slotMinutes:number,defaultDurationMinutes:number}} config
 */
export function placeUntimedTasks(tasks, timed, config) {
  const dayStart = config.startHour * 60;
  const dayEnd = config.endHour * 60;
  /** @type {Array<{task:Task,a:number,b:number,auto:boolean}>} */
  const placed = [];
  /** @type {Task[]} */
  const overflow = [];

  tasks.forEach((task) => {
    let slot = null;
    for (let minutes = dayStart; minutes + config.defaultDurationMinutes <= dayEnd; minutes += config.slotMinutes) {
      const candidate = { a: minutes, b: minutes + config.defaultDurationMinutes };
      const conflictsTimed = timed.some((event) => overlaps(event, candidate));
      const conflictsPlaced = placed.some((event) => overlaps(event, candidate));
      if (!conflictsTimed && !conflictsPlaced) {
        slot = minutes;
        break;
      }
    }
    if (slot == null) overflow.push(task);
    else placed.push({ task, a: slot, b: slot + config.defaultDurationMinutes, auto: true });
  });

  return { placed, overflow };
}

/**
 * @param {{
 *   tasks: Task[],
 *   projects: Project[],
 *   users: AppUser[],
 *   timelineDate: string,
 *   filters: TimelineFilters,
 *   today: string,
 *   statusLabels: Record<string,string>,
 *   priorityLabels: Record<string,string>,
 *   projectName: (id?: string | null) => string,
 *   projectColor: (id?: string | null) => string,
 *   rgba: (hex: string | undefined | null, alpha: number) => string,
 *   userName: (id?: string | null) => string,
 *   taskUserIds: (task: Task) => string[],
 *   D?: (value: string | Date) => Date,
 *   add?: (date: string, days: number) => string,
 *   fmt?: (date: string) => string,
 *   config?: Partial<typeof TIMELINE_DEFAULTS>
 * }} options
 * @returns {TimelinePageModel}
 */
export function createTimelineViewModel(options) {
  const config = { ...TIMELINE_DEFAULTS, ...(options.config || {}) };
  const add = options.add || addDays;
  const D = options.D || toDate;
  const fmt = options.fmt || formatShortDate;
  const weekStart = getWeekStart(options.timelineDate || options.today);
  const days = Array.from({ length: 7 }, (_, index) => add(weekStart, index));
  const hours = [];
  for (let hour = config.startHour; hour <= config.endHour; hour += 1) hours.push(hour);
  const gridHeight = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const filteredTasks = options.tasks.filter((task) => matchesTimelineTask(task, options.filters, { taskUserIds: options.taskUserIds, projectName: options.projectName }));

  /** @param {{task:Task,a:number,b:number,l?:number,n?:number,auto?:boolean, allDay?: boolean}} raw */
  const toEvent = (raw) => {
    const task = raw.task;
    const accent = options.projectColor(task.project_id);
    const a = Math.max(config.startHour * 60, raw.a);
    const b = Math.min(config.endHour * 60, raw.b);
    const top = (a - config.startHour * 60) * config.pixelsPerMinute;
    const height = Math.max(24, (b - a) * config.pixelsPerMinute);
    const startLabel = timeToMinutes(/** @type {any} */ (task).start_time) != null ? String(/** @type {any} */ (task).start_time).slice(0, 5) : '';
    const endLabel = /** @type {any} */ (task).end_time ? String(/** @type {any} */ (task).end_time).slice(0, 5) : '';
    return {
      id: `${task.id}:${raw.auto ? 'auto' : raw.allDay ? 'all' : 'timed'}:${raw.a}`,
      taskId: task.id,
      title: task.title || 'Без названия',
      projectName: options.projectName(task.project_id),
      timeLabel: startLabel ? `${startLabel}${endLabel ? `–${endLabel}` : ''}` : '',
      done: task.status === 'done',
      favorite: Boolean(task.is_favorite),
      recurring: Boolean(task.recurrence_rule_id),
      autoPlaced: Boolean(raw.auto),
      allDay: Boolean(raw.allDay),
      style: raw.allDay ? {} : {
        '--top': `${top}px`,
        '--height': `${height}px`,
        '--lane': raw.l || 0,
        '--lanes': raw.n || 1,
        '--accent': accent,
        '--bg': options.rgba(accent, 0.18)
      }
    };
  };

  return {
    filters: { projectId: 'all', userId: 'all', status: 'all', priority: 'all', showDone: false, query: '', ...options.filters },
    weekLabel: `${fmt(days[0])}–${fmt(days[6])}`,
    gridHeight,
    hours,
    hourLabels: hours.map((hour) => ({
      hour,
      top: ((hour - config.startHour) * 60) * config.pixelsPerMinute,
      labelTop: ((hour - config.startHour) * 60 + config.labelOffsetMinutes) * config.pixelsPerMinute,
      label: `${String(hour).padStart(2, '0')}:00`
    })),
    projectOptions: [{ value: 'all', label: 'Все проекты' }].concat(options.projects.map((project) => ({ value: project.id, label: project.name || 'Без названия' }))),
    userOptions: [{ value: 'all', label: 'Все исполнители' }].concat(options.users.map((user) => ({ value: user.id, label: user.display_name || user.email || 'Без имени' }))),
    statusOptions: [{ value: 'all', label: 'Все статусы' }].concat(Object.entries(options.statusLabels).map(([value, label]) => ({ value, label }))),
    priorityOptions: [{ value: 'all', label: 'Все приоритеты' }].concat(Object.entries(options.priorityLabels).map(([value, label]) => ({ value, label }))),
    days: days.map((date) => {
      const dayTasks = filteredTasks.filter((task) => isTaskInDay(task, date));
      const timed = dayTasks
        .filter((task) => Boolean(/** @type {any} */ (task).start_time) && !Boolean(/** @type {any} */ (task).is_all_day))
        .map((task) => {
          const a = timeToMinutes(/** @type {any} */ (task).start_time) ?? config.startHour * 60;
          return { task, a, b: a + taskDurationMinutes(task, config.defaultDurationMinutes) };
        });
      const untimed = dayTasks.filter((task) => !Boolean(/** @type {any} */ (task).start_time) || Boolean(/** @type {any} */ (task).is_all_day));
      const placement = placeUntimedTasks(untimed, timed, config);
      const laidOut = assignLanes([...timed, ...placement.placed]);
      let nowTop = null;
      if (date === options.today) {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const start = config.startHour * 60;
        const end = config.endHour * 60;
        if (minutes >= start && minutes <= end) nowTop = (minutes - start) * config.pixelsPerMinute;
      }
      return {
        date,
        label: D(date).toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        today: date === options.today,
        timedEvents: laidOut.map(toEvent),
        allDayEvents: placement.overflow.slice(0, 6).map((task) => toEvent({ task, a: 0, b: 0, allDay: true })),
        overflowCount: Math.max(0, placement.overflow.length - 6),
        nowTop
      };
    })
  };
}
