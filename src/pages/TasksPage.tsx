import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { createTaskBoardViewModel } from '../react/tasks/taskBoardModel';
import { TaskBoard } from '../react/tasks/TaskBoard';
import { createTaskCardViewModel } from '../react/tasks/taskCardModel';
import { COLS, PR, ST, D, add, commentsForTask, dt, fmt, projectColor, projectName, rgba, subtasksForTask, taskUserIds, today, userName } from './pageUtils';

export function TasksPage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const model = createTaskBoardViewModel({
    tasks: state.tasks || [],
    users: state.users || [],
    mode: ui.taskBoardMode,
    showDone: true,
    filters: { query: ui.filters.taskSearch || '', projectIds: ['all'], userIds: ['all'], dateMode: 'all' },
    weekStart: today(),
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
  return (
    <section className="panel react-tasks-page">
      <div className="panel-head"><h3>Задачи</h3><div className="row"><button className="btn secondary" onClick={() => ui.setTaskBoardMode('status')}>По статусам</button><button className="btn secondary" onClick={() => ui.setTaskBoardMode('assignee')}>По исполнителям</button><button className="btn secondary" onClick={() => ui.setTaskBoardMode('week')}>По неделе</button></div></div>
      <input className="input" placeholder="Поиск задач" value={ui.filters.taskSearch} onChange={(event) => ui.setFilter('taskSearch', event.currentTarget.value)} />
      <div className={model.className} data-mode={model.dataMode}><TaskBoard model={model} actions={actions} /></div>
    </section>
  );
}
export default TasksPage;
