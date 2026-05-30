import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { TimelinePage as TimelinePageView } from '../react/timeline/TimelinePage';
import { createTimelineViewModel } from '../react/timeline/timelineModel';
import { PR, ST, add, projectColor, projectName, rgba, taskUserIds, today, userName } from './pageUtils';

export function TimelinePage() {
  const state = useWorkspaceState();
  const ui = useWorkspaceUiStore();
  const filters = ui.filters;
  const model = createTimelineViewModel({
    tasks: state.tasks || [],
    projects: state.projects || [],
    users: state.users || [],
    timelineDate: ui.timelineDate || today(),
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
  });
  return (
    <section className="panel react-timeline-page">
      <div className="panel-head">
        <h3>Таймлайн</h3>
        <div className="row">
          <button className="btn secondary" onClick={() => ui.setTimelineDate(add(ui.timelineDate || today(), -7))}>← неделя</button>
          <button className="btn secondary" onClick={() => ui.setTimelineDate(today())}>Сегодня</button>
          <button className="btn secondary" onClick={() => ui.setTimelineDate(add(ui.timelineDate || today(), 7))}>неделя →</button>
        </div>
      </div>
      <div className="timeline-filterbar react-filterbar">
        <input className="input" placeholder="Поиск на таймлайне" value={filters.timelineSearch} onChange={(event) => ui.setFilter('timelineSearch', event.currentTarget.value)} />
        <select className="input" value={filters.timelineProjectId} onChange={(event) => ui.setFilter('timelineProjectId', event.currentTarget.value)}>
          <option value="all">Все проекты</option>
          {(state.projects || []).map((project) => <option key={project.id} value={project.id}>{project.name || 'Без названия'}</option>)}
        </select>
        <select className="input" value={filters.timelineUserId} onChange={(event) => ui.setFilter('timelineUserId', event.currentTarget.value)}>
          <option value="all">Все исполнители</option>
          {(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}
        </select>
        <select className="input" value={filters.timelineStatus} onChange={(event) => ui.setFilter('timelineStatus', event.currentTarget.value)}>
          <option value="all">Все статусы</option>
          {Object.entries(ST).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select className="input" value={filters.timelinePriority} onChange={(event) => ui.setFilter('timelinePriority', event.currentTarget.value)}>
          <option value="all">Все приоритеты</option>
          {Object.entries(PR).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <label className="check-inline"><input type="checkbox" checked={filters.timelineShowDone} onChange={(event) => ui.setFilter('timelineShowDone', event.currentTarget.checked)} /> выполненные</label>
      </div>
      <TimelinePageView model={model} />
    </section>
  );
}
export default TimelinePage;
