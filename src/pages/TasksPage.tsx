// @ts-nocheck
import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { createTaskBoardViewModel } from '../react/tasks/taskBoardModel';
import { TaskBoard } from '../react/tasks/TaskBoard';
import { createTaskCardViewModel } from '../react/tasks/taskCardModel';
import { buildTaskBoardIndexes } from '../react/tasks/taskIndexes';
import { PERFORMANCE_BUDGETS, recordWorkspacePerformanceMetric } from '../shared/production';
import { COLS, PR, ST, D, add, dt, fmt, rgba, today } from './pageUtils';

const TASK_BOARD_MODES = ['status', 'assignee', 'week'];

function weekStart(value) {
  const date = D(value || today());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function closestElement(target, selector) {
  let node = target;
  if (node && node.nodeType !== 1) node = node.parentElement;
  return node && typeof node.closest === 'function' ? node.closest(selector) : null;
}

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function countBoardCards(model) {
  return (model?.columns || []).reduce((sum, column) => sum + (column.cards?.length || 0), 0);
}

function buildTaskBoardModelForMode(mode, state, filters, indexes) {
  return createTaskBoardViewModel({
    tasks: state.tasks || [],
    users: state.users || [],
    mode,
    showDone: filters.tasksShowDone,
    filters: {
      query: filters.taskSearch || '',
      projectIds: [filters.taskProjectId || 'all'],
      userIds: [filters.taskUserId || 'all'],
      dateMode: filters.taskDateMode || 'all',
      dateFrom: filters.taskDateFrom || '',
      dateTo: filters.taskDateTo || ''
    },
    weekStart: state.tasksWeekStart || today(),
    statusColumns: COLS,
    statusLabels: ST,
    tasksLoading: Boolean(state.tasksLoading),
    taskError: state.taskError || '',
    today,
    D,
    add,
    taskUserIds: (task) => indexes.taskUserIds(task),
    taskCard: (task, options) => createTaskCardViewModel(task, {
      fmt, dt, rgba,
      pcolor: (id) => indexes.projectColor(id),
      pname: (id) => indexes.projectName(id),
      uname: (id) => indexes.userName(id),
      tids: (item) => indexes.taskUserIds(item),
      subs: (id) => indexes.subtasksForTask(id),
      today,
      PR,
      ST,
      taskCommentList: (id) => indexes.commentsForTask(id)
    }, options)
  });
}

export function TasksPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const [isSwitching, startSwitch] = React.useTransition();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const filters = ui.filters;
  const previousModeRef = React.useRef(ui.taskBoardMode);
  const modeSwitchStartedAtRef = React.useRef(0);

  const indexes = React.useMemo(() => {
    const startedAt = nowMs();
    const nextIndexes = buildTaskBoardIndexes(state);
    recordWorkspacePerformanceMetric('tasks:indexes', nowMs() - startedAt, {
      tasks: (state.tasks || []).length,
      projects: (state.projects || []).length,
      users: (state.users || []).length,
      assignees: (state.assignees || []).length,
      subtasks: (state.subtasks || []).length,
      comments: (state.taskComments || []).length
    }, PERFORMANCE_BUDGETS.taskModelMs);
    return nextIndexes;
  }, [state.projects, state.users, state.assignees, state.subtasks, state.taskComments, state.tasks]);

  const boardModels = React.useMemo(() => {
    const startedAt = nowMs();
    const modelInputState = { ...state, tasksWeekStart: ui.tasksWeekStart || today() };
    const models = TASK_BOARD_MODES.reduce((acc, mode) => {
      const modeStartedAt = nowMs();
      const nextModel = buildTaskBoardModelForMode(mode, modelInputState, filters, indexes);
      acc[mode] = nextModel;
      recordWorkspacePerformanceMetric(`tasks:model:${mode}`, nowMs() - modeStartedAt, {
        tasks: (state.tasks || []).length,
        cards: countBoardCards(nextModel),
        columns: nextModel.columns?.length || 0
      }, PERFORMANCE_BUDGETS.taskModelMs);
      return acc;
    }, {});
    recordWorkspacePerformanceMetric('tasks:selectors', nowMs() - startedAt, {
      tasks: (state.tasks || []).length,
      users: (state.users || []).length,
      assignees: (state.assignees || []).length,
      subtasks: (state.subtasks || []).length,
      comments: (state.taskComments || []).length,
      statusCards: countBoardCards(models.status),
      assigneeCards: countBoardCards(models.assignee),
      weekCards: countBoardCards(models.week)
    }, PERFORMANCE_BUDGETS.taskModelMs);
    return models;
  }, [
    state.tasks,
    state.users,
    state.tasksLoading,
    state.taskError,
    indexes,
    ui.tasksWeekStart,
    filters.taskSearch,
    filters.taskProjectId,
    filters.taskUserId,
    filters.taskDateMode,
    filters.taskDateFrom,
    filters.taskDateTo,
    filters.tasksShowDone
  ]);

  const model = boardModels[ui.taskBoardMode] || boardModels.status;

  React.useEffect(() => {
    if (previousModeRef.current === ui.taskBoardMode) return;
    const startedAt = modeSwitchStartedAtRef.current || nowMs();
    recordWorkspacePerformanceMetric('tasks:mode-switch', nowMs() - startedAt, {
      from: previousModeRef.current,
      to: ui.taskBoardMode,
      tasks: (state.tasks || []).length,
      cards: countBoardCards(model),
      precomputed: true
    }, PERFORMANCE_BUDGETS.taskModeSwitchMs);
    previousModeRef.current = ui.taskBoardMode;
    modeSwitchStartedAtRef.current = 0;
  }, [ui.taskBoardMode, model, state.tasks]);

  function dropTarget(event) {
    return closestElement(event.target, '[data-status],[data-date],[data-assignee-id]');
  }

  function onDrop(event) {
    const target = dropTarget(event);
    if (!target) return;
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('application/x-task-id');
    if (!taskId) return;
    if (target.dataset.status) actions.moveTask?.(taskId, target.dataset.status);
    else if (target.dataset.date) {
      const date = target.dataset.date === '__none__' ? null : target.dataset.date;
      actions.updateTaskTimeline?.(taskId, date, date);
    } else if (target.dataset.assigneeId && actions.assignTask) {
      actions.assignTask(taskId, target.dataset.assigneeId);
    }
    document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
  }

  function onDragStart(event) {
    const card = closestElement(event.target, '[data-task-id]');
    if (!card?.dataset.taskId) return;
    event.dataTransfer.setData('text/plain', card.dataset.taskId);
    event.dataTransfer.setData('application/x-task-id', card.dataset.taskId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function setMode(mode) {
    modeSwitchStartedAtRef.current = nowMs();
    startSwitch(() => ui.setTaskBoardMode(mode));
  }

  return (
    <section className="panel react-tasks-page" aria-busy={isSwitching ? 'true' : 'false'}>
      <div className="panel-head">
        <h3>Задачи</h3>
        <div className="row task-mode-actions">
          <button className={`btn secondary ${ui.taskBoardMode === 'status' ? 'active' : ''}`} onClick={() => setMode('status')}>По статусам</button>
          <button className={`btn secondary ${ui.taskBoardMode === 'assignee' ? 'active' : ''}`} onClick={() => setMode('assignee')}>По исполнителям</button>
          <button className={`btn secondary ${ui.taskBoardMode === 'week' ? 'active' : ''}`} onClick={() => setMode('week')}>По неделе</button>
        </div>
      </div>

      <div className="task-filterbar react-filterbar">
        <input className="input" placeholder="Поиск задач" value={filters.taskSearch} onChange={(event) => ui.setFilter('taskSearch', event.currentTarget.value)} />
        <select className="input" value={filters.taskProjectId} onChange={(event) => ui.setFilter('taskProjectId', event.currentTarget.value)}>
          <option value="all">Все проекты</option>
          {(state.projects || []).filter((project) => !project.deleted_at).map((project) => <option key={project.id} value={project.id}>{project.name || 'Без названия'}</option>)}
        </select>
        <select className="input" value={filters.taskUserId} onChange={(event) => ui.setFilter('taskUserId', event.currentTarget.value)}>
          <option value="all">Все исполнители</option>
          {(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}
        </select>
        <select className="input" value={filters.taskDateMode} onChange={(event) => ui.setFilter('taskDateMode', event.currentTarget.value)}>
          <option value="all">Все даты</option>
          <option value="overdue">Просроченные</option>
          <option value="exact">На дату</option>
          <option value="from">Начиная с даты</option>
          <option value="range">Диапазон</option>
        </select>
        <input className="input" type="date" value={filters.taskDateFrom} onChange={(event) => ui.setFilter('taskDateFrom', event.currentTarget.value)} />
        <input className="input" type="date" value={filters.taskDateTo} onChange={(event) => ui.setFilter('taskDateTo', event.currentTarget.value)} />
        <label className="check-inline"><input type="checkbox" checked={filters.tasksShowDone} onChange={(event) => ui.setFilter('tasksShowDone', event.currentTarget.checked)} /> выполненные</label>
      </div>

      {ui.taskBoardMode === 'week' ? (
        <div className="row week-controls">
          <button className="btn secondary" onClick={() => ui.setTasksWeekStart(add(weekStart(ui.tasksWeekStart), -7))}>← неделя</button>
          <button className="btn secondary" onClick={() => ui.setTasksWeekStart(today())}>Сегодня</button>
          <button className="btn secondary" onClick={() => ui.setTasksWeekStart(add(weekStart(ui.tasksWeekStart), 7))}>неделя →</button>
          <span className="muted">{model.weekLabel}</span>
        </div>
      ) : null}

      <div
        className={model.className}
        data-mode={model.dataMode}
        onDragStart={onDragStart}
        onDragOver={(event) => { if (dropTarget(event)) event.preventDefault(); }}
        onDragEnter={(event) => { const col = dropTarget(event); if (col) col.classList.add('drag-over'); }}
        onDragLeave={(event) => { const col = dropTarget(event); if (col && !col.contains(event.relatedTarget)) col.classList.remove('drag-over'); }}
        onDrop={onDrop}
      >
        <TaskBoard model={model} actions={actions} />
      </div>
    </section>
  );
}
export default TasksPage;
