import type { AppState, Task } from '../types/entities';

export const ST: Record<string, string> = { idea: 'Идея', planned: 'Запланировано', in_progress: 'В работе', waiting: 'Ожидание', done: 'Завершено', blocked: 'Заблокировано' };
export const PR: Record<string, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
export const COLS = ['planned', 'in_progress', 'waiting', 'done'];

export function pad(value: number) { return String(value).padStart(2, '0'); }
export function ymd(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
export function today() { return ymd(new Date()); }
export function D(value?: string | Date | null) { return value instanceof Date ? new Date(value.getTime()) : new Date(`${String(value || today()).slice(0, 10)}T00:00:00`); }
export function add(value: string, days: number) { const d = D(value); d.setDate(d.getDate() + days); return ymd(d); }
export function fmt(value?: string | null) { return value ? D(value).toLocaleDateString('ru-RU') : '—'; }
export function dt(value?: string | null) { return value ? new Date(value).toLocaleString('ru-RU') : '—'; }
export function rgba(hex?: string | null, alpha = 1) {
  let h = String(hex || '#64748b').replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
export function byId<T extends { id?: string }>(items: T[] | undefined, id?: string | null): T | undefined { return (items || []).find((item) => item.id === id); }
export function projectName(state: AppState, id?: string | null) { return byId(state.projects, id)?.name || '—'; }
export function projectColor(state: AppState, id?: string | null) { return byId(state.projects, id)?.color || '#64748b'; }
export function userName(state: AppState, id?: string | null) { const u = byId(state.users, id); return u?.display_name || u?.email || '—'; }
export function taskUserIds(state: AppState, task: Task) {
  const ids = new Set<string>();
  (state.assignees || []).filter((item) => item.task_id === task.id).forEach((item) => item.user_id && ids.add(item.user_id));
  if (task.assignee_id) ids.add(task.assignee_id);
  return [...ids];
}
export function subtasksForTask(state: AppState, taskId: string) {
  return (state.subtasks || []).filter((item) => item.task_id === taskId && !item.deleted_at).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}
export function commentsForTask(state: AppState, taskId: string) {
  return (state.taskComments || []).filter((item) => item.task_id === taskId && !item.deleted_at);
}
