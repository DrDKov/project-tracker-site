import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { TimelinePage as TimelinePageView } from '../react/timeline/TimelinePage';
import { createTimelineViewModel } from '../react/timeline/timelineModel';
import { PR, ST, add, projectColor, projectName, rgba, taskUserIds, today, userName } from './pageUtils';

export function TimelinePage() {
  const state = useWorkspaceState();
  const model = createTimelineViewModel({
    tasks: state.tasks || [],
    projects: state.projects || [],
    users: state.users || [],
    timelineDate: today(),
    filters: { query: '', projectId: 'all', userId: 'all', status: 'all', priority: 'all', showDone: false },
    today: today(),
    statusLabels: ST,
    priorityLabels: PR,
    projectName: (id) => projectName(state, id),
    projectColor: (id) => projectColor(state, id),
    rgba,
    userName: (id) => userName(state, id),
    taskUserIds: (task) => taskUserIds(state, task),
    add
  });
  return <section className="panel react-timeline-page"><TimelinePageView model={model} /></section>;
}
export default TimelinePage;
