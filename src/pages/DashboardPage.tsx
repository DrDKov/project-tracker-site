import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { createDashboardOverviewModel } from '../react/dashboard/dashboardModel';
import { DashboardFocusTasks, DashboardProjects } from '../react/dashboard/DashboardOverview';
import { createTaskCardViewModel } from '../react/tasks/taskCardModel';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { PR, ST, commentsForTask, dt, fmt, projectColor, projectName, rgba, subtasksForTask, taskUserIds, today, userName } from './pageUtils';

export function DashboardPage() {
  const state = useWorkspaceState();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const model = createDashboardOverviewModel({
    projects: state.projects || [],
    tasks: state.tasks || [],
    users: state.users || [],
    statusLabels: ST,
    priorityLabels: PR,
    fmt,
    rgba,
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
    <div className="dashboard-grid react-dashboard-page">
      <section className="panel"><div className="panel-head"><h3>Проекты</h3></div><div className="project-grid"><DashboardProjects model={model} actions={actions} /></div></section>
      <section className="panel"><div className="panel-head"><h3>Фокус задач</h3></div><div className="kanban"><DashboardFocusTasks model={model} actions={actions} /></div></section>
    </div>
  );
}
export default DashboardPage;
