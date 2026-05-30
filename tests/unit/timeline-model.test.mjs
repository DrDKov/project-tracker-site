import assert from 'node:assert/strict';
import {
  assignLanes,
  createTimelineViewModel,
  formatShortDate,
  getWeekStart,
  isTaskInDay,
  matchesTimelineTask,
  minutesToTime,
  overlaps,
  timeToMinutes
} from '../../src/react/timeline/timelineModel.ts';

const tasks = [
  { id: 't1', project_id: 'p1', title: 'Плановая задача', status: 'planned', priority: 'high', start_date: '2026-06-01', due_date: '2026-06-01', start_time: '09:00', end_time: '10:00', assignee_id: 'u1', is_favorite: true },
  { id: 't2', project_id: 'p1', title: 'Без времени', status: 'in_progress', priority: 'medium', start_date: '2026-06-01', due_date: '2026-06-01', assignee_id: 'u2', recurrence_rule_id: 'r1' },
  { id: 't3', project_id: 'p2', title: 'Завершено', status: 'done', priority: 'low', start_date: '2026-06-02', due_date: '2026-06-02', start_time: '09:30', duration_minutes: 45, assignee_id: 'u1' }
];

assert.equal(timeToMinutes('09:30'), 570);
assert.equal(minutesToTime(570), '09:30');
assert.equal(getWeekStart('2026-06-03'), '2026-06-01');
assert.equal(formatShortDate('2026-06-01'), '01.06');
assert.equal(isTaskInDay(tasks[0], '2026-06-01'), true);
assert.equal(overlaps({ a: 10, b: 20 }, { a: 19, b: 30 }), true);
assert.equal(assignLanes([{ a: 540, b: 600 }, { a: 570, b: 620 }])[1].l, 1);
assert.equal(matchesTimelineTask(tasks[0], { query: 'плановая', projectId: 'all', userId: 'all', status: 'all', priority: 'all', showDone: false }, { taskUserIds: (task) => [task.assignee_id].filter(Boolean), projectName: () => 'Салым' }), true);
assert.equal(matchesTimelineTask(tasks[2], { showDone: false }, { taskUserIds: () => [], projectName: () => '' }), false);

const model = createTimelineViewModel({
  tasks,
  projects: [{ id: 'p1', name: 'Салым' }, { id: 'p2', name: 'МНПЗ' }],
  users: [{ id: 'u1', display_name: 'Иван' }, { id: 'u2', display_name: 'Мария' }],
  timelineDate: '2026-06-03',
  filters: { query: '', projectId: 'all', userId: 'all', status: 'all', priority: 'all', showDone: false },
  today: '2026-06-01',
  statusLabels: { planned: 'Запланировано', in_progress: 'В работе', done: 'Завершено' },
  priorityLabels: { high: 'Высокий', medium: 'Средний', low: 'Низкий' },
  projectName: (id) => id === 'p1' ? 'Салым' : 'МНПЗ',
  projectColor: () => '#2563eb',
  rgba: (hex, alpha) => `${hex}:${alpha}`,
  userName: (id) => id === 'u1' ? 'Иван' : 'Мария',
  taskUserIds: (task) => [task.assignee_id].filter(Boolean)
});

assert.equal(model.weekLabel, '01.06–07.06');
assert.equal(model.days.length, 7);
const monday = model.days.find((day) => day.date === '2026-06-01');
assert.ok(monday);
assert.equal(monday.today, true);
assert.ok(monday.timedEvents.some((event) => event.taskId === 't1' && event.favorite));
assert.ok(monday.timedEvents.some((event) => event.taskId === 't2' && event.autoPlaced));
assert.equal(model.projectOptions.length, 3);
assert.equal(model.userOptions.length, 3);

const filtered = createTimelineViewModel({ ...model, tasks, projects: [], users: [], timelineDate: '2026-06-03', filters: { projectId: 'p2', showDone: true }, today: '2026-06-01', statusLabels: {}, priorityLabels: {}, projectName: () => '', projectColor: () => '#000', rgba: () => '', userName: () => '', taskUserIds: (task) => [task.assignee_id].filter(Boolean) });
assert.equal(filtered.days.flatMap((day) => day.timedEvents).some((event) => event.taskId === 't3'), true);

console.log('timeline model tests passed');
