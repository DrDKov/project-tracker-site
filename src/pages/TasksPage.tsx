import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { createTaskBoardViewModel } from '../react/tasks/taskBoardModel';
import { TaskBoard } from '../react/tasks/TaskBoard';
import { createTaskCardViewModel } from '../react/tasks/taskCardModel';
import { COLS, PR, ST, D, add, commentsForTask, dt, fmt, projectColor, projectName, rgba, subtasksForTask, taskUserIds, today, userName } from './pageUtils';

function weekStart(value: string) {
  const date = D(value || today());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function TasksPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const filters = ui.filters;
  const model = createTaskBoardViewModel({
    tasks: state.tasks || [],
    users: state.users || [],
    mode: ui.taskBoardMode,
    showDone: filters.tasksShowDone,
    filters: {
      query: filters.taskSearch || '',
      projectIds: [filters.taskProjectId || 'all'],
      userIds: [filters.taskUserId || 'all'],
      dateMode: filters.taskDateMode || 'all',
      dateFrom: filters.taskDateFrom || '',
      dateTo: filters.taskDateTo || ''
    },
    weekStart: ui.tasksWeekStart || today(),
    statusColumns: COLS,
    statusLabels: ST,
    tasksLoading: Boolean(state.tasksLoading),
    taskError: state.taskError || '',
    today,
    D,
    add,
    taskUserIds: (task) => taskUserIds(state, task),
    taskCard: (task, options) => createTaskCardViewModel(task, {
      fmt, dt, rgba,
      pcolor: (id) => projectColor(state, id),
      pname: (id) => projectName(state, id),
      uname: (id) => userName(state, id),
      tids: (item) => taskUserIds(state, item),
      subs: (id) => subtasksForTask(state, id),
      today,
      PR,
      ST,
      taskCommentList: (id) => commentsForTask(state, id)
    }, options)
  });

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('application/x-task-id');
    const target = (event.target as HTMLElement).closest('[data-status]') as HTMLElement | null;
    const status = target?.dataset.status;
    if (taskId && status) actions.moveTask?.(taskId, status);
    document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
  }

  function onDragStart(event: React.DragEvent<HTMLDivElement>) {
    const card = (event.target as HTMLElement).closest('[data-task-id]') as HTMLElement | null;
    if (!card?.dataset.taskId) return;
    event.dataTransfer.setData('text/plain', card.dataset.taskId);
    event.dataTransfer.setData('application/x-task-id', card.dataset.taskId);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <section className="panel react-tasks-page">
      <div className="panel-head">
        <h3>Задачи</h3>
        <div className="row">
          <button className="btn secondary" onClick={() => ui.setTaskBoardMode('status')}>По статусам</button>
          <button className="btn secondary" onClick={() => ui.setTaskBoardMode('assignee')}>По исполнителям</button>
          <button className="btn secondary" onClick={() => ui.setTaskBoardMode('week')}>По неделе</button>
          <button className="btn primary" onClick={() => actions.openTask?.()}>+ Задача</button>
        </div>
      </div>

      <div className="task-filterbar react-filterbar">
        <input className="input" placeholder="Поиск задач" value={filters.taskSearch} onChange={(event) => ui.setFilter('taskSearch', event.currentTarget.value)} />
        <select className="input" value={filters.taskProjectId} onChange={(event) => ui.setFilter('taskProjectId', event.currentTarget.value)}>
          <option value="all">Все проекты</option>
          {(state.projects || []).map((project) => <option key={project.id} value={project.id}>{project.name || 'Без названия'}</option>)}
        </select>
        <select className="input" value={filters.taskUserId} onChange={(event) => ui.setFilter('taskUserId', event.currentTarget.value)}>
          <option value="all">Все исполнители</option>
          {(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}
        </select>
        <select className="input" value={filters.taskDateMode} onChange={(event) => ui.setFilter('taskDateMode', event.currentTarget.value as any)}>
          <option value="all">Все даты</option>
          <option value="overdue">Просроченные</option>
          <option value="exact">На дату</option>
          <option value="from">Начиная с даты</option>
          <option value="range">Диапазон</option>
        </select>
        <input className="input" type="date" value={filters.taskDateFrom} onChange={(event) => ui.setFilter('taskDateFrom', event.currentTarget.value)} />
        <input className="input" type="date" value={filters.taskDateTo} onChange={(event) => ui.setFilter('taskDateTo', event.currentTarget.value)} />
        <label className="check-inline"><input type="checkbox" checked={filters.tasksShowDone} onChange={(event) => ui.setFilter('tasksShowDone', event.currentTarget.checked)} /> показывать выполненные</label>
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
        onDragOver={(event) => { if ((event.target as HTMLElement).closest('[data-status]')) event.preventDefault(); }}
        onDragEnter={(event) => { const col = (event.target as HTMLElement).closest('[data-status]'); if (col) col.classList.add('drag-over'); }}
        onDragLeave={(event) => { const col = (event.target as HTMLElement).closest('[data-status]'); if (col && !col.contains(event.relatedTarget as Node)) col.classList.remove('drag-over'); }}
        onDrop={onDrop}
      >
        <TaskBoard model={model} actions={actions} />
      </div>
    </section>
  );
}
export default TasksPage;
