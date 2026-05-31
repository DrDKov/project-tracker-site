// @ts-nocheck
import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { TimelinePage as TimelinePageView } from '../react/timeline/TimelinePage';
import { createTimelineViewModel } from '../react/timeline/timelineModel';
import { PR, ST, add, projectColor, projectName, rgba, taskUserIds, today, userName } from './pageUtils';

export function TimelinePage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const filters = ui.filters;
  const currentDate = ui.timelineDate || today();
  const model = React.useMemo(() => createTimelineViewModel({
    tasks: state.tasks || [],
    projects: state.projects || [],
    users: state.users || [],
    timelineDate: currentDate,
    filters: {
      query: filters.timelineSearch || '',
      projectId: filters.timelineProjectId || 'all',
      userId: filters.timelineUserId || 'all',
      status: filters.timelineStatus || 'all',
      priority: filters.timelinePriority || 'all',
      showDone: filters.timelineShowDone
    },
    today: today(),
    statusLabels: ST,
    priorityLabels: PR,
    projectName: (id) => projectName(state, id),
    projectColor: (id) => projectColor(state, id),
    rgba,
    userName: (id) => userName(state, id),
    taskUserIds: (task) => taskUserIds(state, task),
    add
  }), [state.tasks, state.projects, state.users, state.assignees, currentDate, filters.timelineSearch, filters.timelineProjectId, filters.timelineUserId, filters.timelineStatus, filters.timelinePriority, filters.timelineShowDone]);

  const timelineActions = React.useMemo(() => ({
    ...actions,
    prevWeek: () => ui.setTimelineDate(add(currentDate, -7)),
    nextWeek: () => ui.setTimelineDate(add(currentDate, 7)),
    today: () => ui.setTimelineDate(today()),
    setFilter: (name, value) => ui.setFilter(name, value)
  }), [actions, ui, currentDate]);

  return (
    <section className="panel react-timeline-page">
      <div className="panel-head">
        <h3>Таймлайн</h3>
      </div>
      <TimelinePageView model={model} actions={timelineActions} />
    </section>
  );
}
export default TimelinePage;
