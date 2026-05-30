// @ts-check
import { createTaskBoardViewModel, getWeekStart } from '../../react/tasks/taskBoardModel.ts';
import { mountTaskBoard } from '../../react/tasks/mountTaskBoard.tsx';
import { createWorkspaceReactActions } from '../../react/actions/workspaceActions.ts';

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {Record<string, any>} TaskCardViewModel */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   qa: (selector: string) => any[],
 *   vals: (id: string) => string[],
 *   esc: (value: unknown) => string,
 *   ST: Record<string, string>,
 *   COLS: string[],
 *   tids: (task: Task) => string[],
 *   taskCardModel: (task: Task, options?: { showStatus?: boolean }) => TaskCardViewModel,
 *   today: () => string,
 *   D: (value: string | Date) => Date,
 *   add: (date: string, days: number) => string,
 *   diff: (from: string, to: string) => number,
 *   byId: <T extends { id?: string }>(items: T[], id?: string | null) => T | undefined,
 *   saveTaskOrder: (client: any, tasks: Task[]) => Promise<unknown>,
 *   setTaskPrimaryAssignee: (client: any, taskId: string, userId: string | null) => Promise<string | null>,
 *   updateTaskDateRange: (client: any, taskId: string, patch: Record<string, unknown>) => Promise<unknown>
 * }} deps
 */
export function createTasksBoardRenderer(deps) {
  const {
    S,
    $,
    qa,
    vals,
    ST,
    COLS,
    tids,
    taskCardModel,
    today,
    D,
    add,
    diff,
    byId,
    saveTaskOrder,
    setTaskPrimaryAssignee,
    updateTaskDateRange
  } = deps;

  const reactActions = createWorkspaceReactActions();

  const MODE_KEY = 'pt_tasks_board_mode';
  const DONE_KEY = 'pt_tasks_show_done';
  const WEEK_KEY = 'pt_tasks_week_start';
  const DATE_MODE_KEY = 'pt_tasks_date_mode';
  const DATE_FROM_KEY = 'pt_tasks_date_from';
  const DATE_TO_KEY = 'pt_tasks_date_to';

  function readStoredState() {
    if (!S.taskBoardMode) {
      try { S.taskBoardMode = localStorage.getItem(MODE_KEY) || localStorage.getItem('pt_task_board_mode_v1') || 'status'; }
      catch { S.taskBoardMode = 'status'; }
    }
    if (!['status', 'assignee', 'week'].includes(String(S.taskBoardMode))) S.taskBoardMode = 'status';

    if (S.tasksShowDone == null) {
      try { S.tasksShowDone = localStorage.getItem(DONE_KEY) !== '0'; }
      catch { S.tasksShowDone = true; }
    }

    if (!S.tasksWeekStart) {
      try { S.tasksWeekStart = getWeekStart(D, localStorage.getItem(WEEK_KEY) || today()); }
      catch { S.tasksWeekStart = getWeekStart(D, today()); }
    }

    if (!S.tasksDateMode) {
      try {
        S.tasksDateMode = localStorage.getItem(DATE_MODE_KEY) || 'all';
        S.tasksDateFrom = localStorage.getItem(DATE_FROM_KEY) || '';
        S.tasksDateTo = localStorage.getItem(DATE_TO_KEY) || '';
      } catch {
        S.tasksDateMode = 'all';
        S.tasksDateFrom = '';
        S.tasksDateTo = '';
      }
    }
  }

  function persistMode() {
    try {
      localStorage.setItem(MODE_KEY, String(S.taskBoardMode || 'status'));
      localStorage.setItem('pt_task_board_mode_v1', String(S.taskBoardMode || 'status'));
    } catch {}
  }

  function persistDone() {
    try { localStorage.setItem(DONE_KEY, S.tasksShowDone ? '1' : '0'); }
    catch {}
  }

  function persistWeek() {
    try { localStorage.setItem(WEEK_KEY, String(S.tasksWeekStart || today())); }
    catch {}
  }

  function persistDateFilter() {
    try {
      localStorage.setItem(DATE_MODE_KEY, String(S.tasksDateMode || 'all'));
      localStorage.setItem(DATE_FROM_KEY, String(S.tasksDateFrom || ''));
      localStorage.setItem(DATE_TO_KEY, String(S.tasksDateTo || ''));
    } catch {}
  }

  function ensureToolbar() {
    const toolbar = $('tasks')?.querySelector('.toolbar');
    if (!toolbar) return;

    if (!$('taskBoardModeToggle')) {
      const switcher = document.createElement('div');
      switcher.id = 'taskBoardModeToggle';
      switcher.className = 'task-mode-toggle';
      switcher.innerHTML = '<button type="button" data-task-mode="status">По статусам</button><button type="button" data-task-mode="assignee">По исполнителям</button><button type="button" data-task-mode="week">По неделе</button>';
      toolbar.insertBefore(switcher, $('newTaskBtn') || null);
      switcher.addEventListener('click', (event) => {
        const button = /** @type {HTMLElement | null} */ (event.target instanceof Element ? event.target.closest('[data-task-mode]') : null);
        if (!button) return;
        S.taskBoardMode = ['status', 'assignee', 'week'].includes(String(button.dataset.taskMode)) ? button.dataset.taskMode : 'status';
        persistMode();
        renderTasks();
      });
    }

    if (!$('taskShowDoneWrap')) {
      const doneToggle = document.createElement('label');
      doneToggle.id = 'taskShowDoneWrap';
      doneToggle.className = 'task-done-toggle';
      doneToggle.innerHTML = '<input id="taskShowDoneToggle" type="checkbox"> <span>Выполненные</span>';
      toolbar.insertBefore(doneToggle, $('taskBoardModeToggle') || $('newTaskBtn'));
      doneToggle.addEventListener('change', () => {
        S.tasksShowDone = Boolean($('taskShowDoneToggle')?.checked);
        persistDone();
        renderTasks();
      });
    }

    if (!$('taskDateFilter')) {
      const filter = document.createElement('div');
      filter.id = 'taskDateFilter';
      filter.className = 'task-date-filter';
      filter.innerHTML = '<select class="input" id="taskDateMode"><option value="all">Все даты</option><option value="range">Интервал дат</option><option value="from">С даты и далее</option><option value="exact">На конкретную дату</option><option value="overdue">Просроченные</option></select><input class="input" id="taskDateFrom" type="date"><input class="input" id="taskDateTo" type="date"><button class="btn secondary" id="taskDateReset" type="button">Сбросить даты</button>';
      toolbar.insertBefore(filter, $('newTaskBtn'));
      filter.addEventListener('input', updateDateFilterFromDom);
      filter.addEventListener('change', updateDateFilterFromDom);
      $('taskDateReset').addEventListener('click', () => {
        S.tasksDateMode = 'all';
        S.tasksDateFrom = '';
        S.tasksDateTo = '';
        persistDateFilter();
        renderTasks();
      });
    }

    if (!$('taskWeekNav')) {
      const nav = document.createElement('div');
      nav.id = 'taskWeekNav';
      nav.className = 'task-week-nav hidden';
      nav.innerHTML = '<button class="btn secondary" data-week-nav="prev" type="button">←</button><span class="week-label" id="taskWeekLabel"></span><button class="btn secondary" data-week-nav="next" type="button">→</button><button class="btn secondary" data-week-nav="today" type="button">Текущая неделя</button>';
      toolbar.insertBefore(nav, $('newTaskBtn'));
      nav.addEventListener('click', (event) => {
        const button = /** @type {HTMLElement | null} */ (event.target instanceof Element ? event.target.closest('[data-week-nav]') : null);
        if (!button) return;
        let current = getWeekStart(D, String(S.tasksWeekStart || today()));
        if (button.dataset.weekNav === 'prev') current = add(current, -7);
        if (button.dataset.weekNav === 'next') current = add(current, 7);
        if (button.dataset.weekNav === 'today') current = getWeekStart(D, today());
        S.tasksWeekStart = current;
        persistWeek();
        renderTasks();
      });
    }
  }

  function updateDateFilterFromDom() {
    S.tasksDateMode = $('taskDateMode')?.value || 'all';
    S.tasksDateFrom = $('taskDateFrom')?.value || '';
    S.tasksDateTo = $('taskDateTo')?.value || '';
    persistDateFilter();
    renderTasks();
  }

  function syncToolbar(model) {
    const done = $('taskShowDoneToggle');
    if (done) done.checked = Boolean(S.tasksShowDone);

    const mode = $('taskDateMode');
    const from = $('taskDateFrom');
    const to = $('taskDateTo');
    if (mode) mode.value = String(S.tasksDateMode || 'all');
    if (from) {
      from.value = String(S.tasksDateFrom || '');
      from.disabled = ['all', 'overdue'].includes(String(S.tasksDateMode || 'all'));
    }
    if (to) {
      to.value = String(S.tasksDateTo || '');
      to.disabled = String(S.tasksDateMode || 'all') !== 'range';
    }

    const weekNav = $('taskWeekNav');
    if (weekNav) weekNav.classList.toggle('hidden', model.mode !== 'week');
    const weekLabel = $('taskWeekLabel');
    if (weekLabel) weekLabel.textContent = model.weekLabel;

    qa('#taskBoardModeToggle [data-task-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.taskMode === model.mode);
    });
  }

  /** @param {Task} task */
  function taskUserIds(task) {
    return Array.from(new Set(tids(task).filter(Boolean)));
  }

  /** @param {Task} task */
  function isDone(task) {
    return task.status === 'done';
  }

  /** @param {string[]} taskIds */
  async function saveOrder(taskIds) {
    const index = new Map(taskIds.map((id, position) => [id, position]));
    const changed = S.tasks.filter((task) => index.has(task.id));
    changed.forEach((task) => { task.sort_order = index.get(task.id) ?? 0; });
    await saveTaskOrder(S.sb, changed);
  }

  /**
   * @param {Task} task
   * @param {string | null} userId
   */
  async function setAssignee(task, userId) {
    const value = await setTaskPrimaryAssignee(S.sb, task.id, userId);
    task.assignee_id = value;
    S.assignees = S.assignees.filter((assignee) => assignee.task_id !== task.id);
    if (value) S.assignees.push({ task_id: task.id, user_id: value });
  }

  /**
   * @param {Task} task
   * @param {string | null} targetDate
   */
  async function setTaskDate(task, targetDate) {
    const patch = /** @type {Record<string, unknown>} */ ({ updated_at: new Date().toISOString() });
    if (!targetDate || targetDate === '__none__') {
      patch.start_date = null;
      patch.due_date = null;
    } else if (task.start_date && task.due_date) {
      const duration = Math.max(0, diff(task.start_date, task.due_date));
      patch.start_date = targetDate;
      patch.due_date = add(targetDate, duration);
    } else if (task.due_date) {
      patch.due_date = targetDate;
    } else if (task.start_date) {
      patch.start_date = targetDate;
    } else {
      patch.due_date = targetDate;
    }
    await updateTaskDateRange(S.sb, task.id, patch);
    Object.assign(task, patch);
  }

  function bindAssigneeAndWeekDnD() {
    if (S.taskBoardDndReactStage5) return;
    S.taskBoardDndReactStage5 = true;

    document.addEventListener('dragover', (event) => {
      if (!['assignee', 'week'].includes(String(S.taskBoardMode))) return;
      const column = event.target instanceof Element ? event.target.closest(S.taskBoardMode === 'week' ? '.week-col' : '.assignee-col') : null;
      if (!column) return;
      event.preventDefault();
      column.classList.add('drag-over');
    }, true);

    document.addEventListener('dragleave', (event) => {
      const column = event.target instanceof Element ? event.target.closest('.assignee-col,.week-col') : null;
      if (column) column.classList.remove('drag-over');
    }, true);

    document.addEventListener('drop', async (event) => {
      if (!['assignee', 'week'].includes(String(S.taskBoardMode))) return;
      const column = event.target instanceof Element ? event.target.closest(S.taskBoardMode === 'week' ? '.week-col' : '.assignee-col') : null;
      if (!(column instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      qa('.assignee-col,.week-col').forEach((item) => item.classList.remove('drag-over'));

      const id = S.dragTask || event.dataTransfer?.getData('text/plain');
      const task = byId(S.tasks, id);
      if (!task) return;

      const sameDoneCards = /** @type {HTMLElement[]} */ (Array.from(column.querySelectorAll('.task-card[data-task-id]'))
        .filter((element) => element instanceof HTMLElement && element.dataset.taskId !== id));

      const sameDoneOrderedCards = sameDoneCards.filter((element) => {
          const existing = byId(S.tasks, element.dataset.taskId || '');
          return existing && isDone(existing) === isDone(task);
        });

      let before = null;
      for (const element of sameDoneOrderedCards) {
        const box = element.getBoundingClientRect();
        if (event.clientY < box.top + box.height / 2) {
          before = element.dataset.taskId || null;
          break;
        }
      }

      const order = sameDoneOrderedCards.map((element) => element.dataset.taskId || '').filter(Boolean);
      const index = before ? order.indexOf(before) : -1;
      if (index < 0) order.push(id);
      else order.splice(index, 0, id);

      try {
        if (S.taskBoardMode === 'assignee') await setAssignee(task, column.dataset.assigneeId === '__none__' ? null : column.dataset.assigneeId || null);
        else await setTaskDate(task, column.dataset.date || '__none__');
        await saveOrder(Array.from(new Set(order)));
        renderTasks();
      } catch (error) {
        alert(`Не удалось переместить задачу: ${error.message || error}`);
        renderTasks();
      }
      S.dragTask = null;
    }, true);
  }

  function renderTasks() {
    document.body.classList.add('v24-ready');
    const container = $('kanban');
    if (!(container instanceof HTMLElement)) return;

    readStoredState();
    ensureToolbar();
    bindAssigneeAndWeekDnD();

    const model = createTaskBoardViewModel({
      tasks: S.tasks || [],
      users: S.users || [],
      mode: String(S.taskBoardMode || 'status'),
      showDone: Boolean(S.tasksShowDone),
      filters: {
        query: $('taskSearch')?.value || '',
        projectIds: vals('taskProjectFilter'),
        userIds: vals('taskAssigneeFilter'),
        dateMode: /** @type {'all' | 'range' | 'from' | 'exact' | 'overdue'} */ (S.tasksDateMode || 'all'),
        dateFrom: S.tasksDateFrom || '',
        dateTo: S.tasksDateTo || ''
      },
      weekStart: String(S.tasksWeekStart || today()),
      statusColumns: COLS,
      statusLabels: ST,
      tasksLoading: Boolean(S.tasksLoading),
      taskError: S.taskError || '',
      today,
      D,
      add,
      taskUserIds,
      taskCard: taskCardModel
    });

    syncToolbar(model);
    mountTaskBoard(container, model, reactActions);
  }

  return { renderTasks };
}
