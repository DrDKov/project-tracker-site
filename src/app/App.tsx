// @ts-nocheck
import React from 'react';
import { ReactAppProviders } from '../react/app/ReactAppProviders';
import { AppSidebar, AppTopbar } from '../react/app-shell/AppShell';
import { createAppShellModel } from '../react/app-shell/appShellModel';
import { useWorkspaceRoute } from './router/useWorkspaceRoute';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { useWorkspaceUiStore } from '../shared/store/uiStore';
import { installWorkspaceStore, restoreWorkspaceSession, invalidateWorkspaceData } from './workspaceRuntime';
import { getWorkspacePermissionSnapshot } from '../core/permissions/index.js';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { EmptyState } from '../shared/ui';
import { PwaLifecycle } from '../react/pwa';
import { createRecurringTaskSet } from '../services/tasks.service.js';
import { AppErrorBoundary, LazyRouteFallback, PERFORMANCE_BUDGETS, markWorkspacePerformance, measureWorkspacePerformance, scheduleIdleTask } from '../shared/production';
import {
  LazyAuditPage,
  LazyChatPage,
  LazyDashboardPage,
  LazyMaterialsPage,
  LazyProjectsPage,
  LazySettingsPage,
  LazyTasksPage,
  LazyTeamPage,
  LazyTimelinePage
} from './lazyPages';

function ymd(value) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function addDays(date, days) { const value = new Date(`${String(date).slice(0, 10)}T00:00:00`); value.setDate(value.getDate() + days); return ymd(value); }
function diffDays(start, end) { return Math.max(0, Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000)); }
function weekdayNumber(date) { const day = new Date(`${date}T00:00:00`).getDay(); return day === 0 ? 7 : day; }
function addMonthsClamped(date, months) {
  const source = new Date(`${date}T00:00:00`);
  const anchor = source.getDate();
  const target = new Date(source.getFullYear(), source.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchor, last));
  return ymd(target);
}
function generateRepeatDates({ start, until, type, weekdays }) {
  if (!start || !until) return [];
  if (until < start) throw new Error('Дата окончания повторения не может быть раньше даты старта');
  const out = [];
  if (type === 'daily') for (let date = start; date <= until; date = addDays(date, 1)) out.push(date);
  else if (type === 'weekdays') {
    const set = new Set((weekdays || []).map(Number));
    if (!set.size) throw new Error('Выберите дни недели для повторения');
    for (let date = start; date <= until; date = addDays(date, 1)) if (set.has(weekdayNumber(date))) out.push(date);
  } else if (type === 'weekly') for (let date = start; date <= until; date = addDays(date, 7)) out.push(date);
  else if (type === 'monthly') for (let index = 0, date = start; date <= until; index += 1, date = addMonthsClamped(start, index)) out.push(date);
  if (out.length > 370) throw new Error('Слишком много повторений: максимум 370 задач');
  return out;
}
function notificationKey(item) { return String(item?.id || item?.notification_id || `${item?.type || item?.kind || 'notification'}:${item?.task_id || ''}:${item?.created_at || item?.updated_at || ''}:${item?.title || item?.body || ''}`); }
function notificationDateValue(item) { return item?.created_at || item?.updated_at || item?.date || ''; }
function notificationTs(item) { const time = Date.parse(notificationDateValue(item)); return Number.isFinite(time) ? time : 0; }
function notificationKind(item) {
  const raw = String(item?.kind || item?.type || item?.event_type || '').toLowerCase();
  const text = `${item?.title || ''} ${item?.body || ''}`.toLowerCase();
  if (raw.includes('mention') || text.includes('упом')) return 'Упоминание';
  if (raw.includes('comment') || text.includes('коммент')) return 'Комментарий';
  if (raw.includes('assign') || text.includes('назнач')) return 'Назначение';
  return 'Оповещение';
}
function notificationTitle(item) { return item?.title || (notificationKind(item) === 'Назначение' ? 'Вам назначили задачу' : 'Оповещение'); }
function notificationBody(item) { return item?.body || item?.message || item?.task_title || item?.title || ''; }
function notificationTimeLabel(item) { const raw = notificationDateValue(item); return raw ? String(raw).slice(0, 16).replace('T', ' ') : ''; }
function normalizeMentionSearch(value) { return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9@._\-/\s]+/gi, ' ').replace(/\s+/g, ' ').trim(); }
function userMentionLabel(user) { return String(user?.display_name || user?.email || 'Пользователь').trim(); }
function findMentionTrigger(text, cursor) {
  const before = String(text || '').slice(0, Math.max(0, cursor || 0));
  const match = before.match(/(^|\s)@([^@\s]*)$/u);
  if (!match) return null;
  const query = match[2] || '';
  return { query, start: before.length - query.length - 1, end: before.length };
}
function canDeleteTaskComment(comment, profile) {
  if (!comment || !profile) return false;
  if (profile.role === 'owner') return true;
  const authorId = comment.user_id || comment.author_id || comment.created_by;
  return authorId && String(authorId) === String(profile.id);
}

function WorkspaceBoot() {
  React.useEffect(() => {
    markWorkspacePerformance('workspace:boot:start');
    installWorkspaceStore();
    window.__PT_APP_BOOTSTRAPPED__ = true;
    window.__PT_LOADED_MODULES__ = ['pwa', 'react-root'];
    restoreWorkspaceSession().finally(() => {
      markWorkspacePerformance('workspace:boot:end');
      measureWorkspacePerformance('workspace:boot', 'workspace:boot:start', 'workspace:boot:end', PERFORMANCE_BUDGETS.appBootMs);
    });
  }, []);
  return null;
}

function RoutePerformanceMarker({ routeId }) {
  React.useEffect(() => {
    const start = `workspace:route:${routeId}:start`;
    const end = `workspace:route:${routeId}:end`;
    markWorkspacePerformance(start);
    scheduleIdleTask(() => measureWorkspacePerformance(`workspace:route:${routeId}`, start, end, PERFORMANCE_BUDGETS.routeRenderMs), 1500);
  }, [routeId]);
  return null;
}

function TaskModal({ state, actions, onClose }) {
  const ui = useWorkspaceUiStore();
  const id = ui.modals.taskId;
  const draft = ui.modals.taskDraft || {};
  const task = id ? (state.tasks || []).find((item) => item.id === id) : null;
  const source = task || draft || {};
  const [repeatEnabled, setRepeatEnabled] = React.useState(false);
  const [repeatType, setRepeatType] = React.useState('daily');
  const [repeatUntil, setRepeatUntil] = React.useState('');
  const [repeatWeekdays, setRepeatWeekdays] = React.useState([]);
  const [commentText, setCommentText] = React.useState('');
  const [mentionState, setMentionState] = React.useState(null);
  const commentInputRef = React.useRef(null);
  const comments = React.useMemo(() => (state.taskComments || [])
    .filter((item) => item.task_id === id && !item.deleted_at)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))), [state.taskComments, id]);
  const selectedUsers = new Set((state.assignees || []).filter((item) => item.task_id === id).map((item) => String(item.user_id || '')).filter(Boolean));
  if (task?.assignee_id) selectedUsers.add(String(task.assignee_id));
  if (!id && state.profile?.id) selectedUsers.add(String(state.profile.id));
  const selectedUserValues = Array.from(selectedUsers);
  const activeProjectId = source.project_id || task?.project_id || '';
  const userById = React.useMemo(() => new Map((state.users || []).map((user) => [user.id, user])), [state.users]);
  const mentionableUsers = React.useMemo(() => {
    const users = (state.users || []).filter((user) => user?.id && user.is_active !== false);
    if (state.profile?.role === 'owner') return users;
    const myId = state.profile?.id;
    const myProjects = new Set((state.members || []).filter((member) => String(member.user_id) === String(myId)).map((member) => member.project_id));
    const allowed = new Set();
    (state.members || []).forEach((member) => {
      if (myProjects.has(member.project_id)) allowed.add(member.user_id);
      if (activeProjectId && String(member.project_id) === String(activeProjectId)) allowed.add(member.user_id);
    });
    selectedUserValues.forEach((userId) => allowed.add(userId));
    if (myId) allowed.add(myId);
    return users.filter((user) => allowed.has(user.id));
  }, [state.users, state.members, state.profile?.id, state.profile?.role, activeProjectId, selectedUserValues.join('|')]);
  const mentionSuggestions = React.useMemo(() => {
    if (!mentionState) return [];
    const query = normalizeMentionSearch(mentionState.query);
    return mentionableUsers.filter((user) => {
      const haystack = normalizeMentionSearch(`${userMentionLabel(user)} ${user.email || ''}`);
      return !query || haystack.includes(query);
    }).slice(0, 8);
  }, [mentionState, mentionableUsers]);

  function toggleWeekday(value, checked) { setRepeatWeekdays((items) => checked ? Array.from(new Set(items.concat([value]))) : items.filter((item) => item !== value)); }
  function syncMentionState(text, cursor) { setMentionState(findMentionTrigger(text, cursor)); }
  function handleCommentChange(event) {
    const value = event.currentTarget.value;
    setCommentText(value);
    syncMentionState(value, event.currentTarget.selectionStart || value.length);
  }
  function handleCommentCursor(event) { syncMentionState(commentText, event.currentTarget.selectionStart || commentText.length); }
  function insertMention(user) {
    if (!user) return;
    const fallback = { start: commentText.length, end: commentText.length };
    const range = mentionState || fallback;
    const token = `@${userMentionLabel(user)}`.replace(/\s+/g, ' ').trim();
    const next = `${commentText.slice(0, range.start)}${token} ${commentText.slice(range.end).replace(/^\s+/, '')}`;
    const nextCursor = Math.min(next.length, range.start + token.length + 1);
    setCommentText(next);
    setMentionState(null);
    window.setTimeout(() => {
      commentInputRef.current?.focus?.();
      commentInputRef.current?.setSelectionRange?.(nextCursor, nextCursor);
    }, 0);
  }
  function handleCommentKeyDown(event) {
    if (!mentionState || !mentionSuggestions.length) return;
    if (event.key === 'Escape') { event.preventDefault(); setMentionState(null); return; }
    if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); insertMention(mentionSuggestions[0]); }
  }

  async function createRecurringTask(row, assigneeIds) {
    const start = row.start_date || row.due_date;
    if (!start) throw new Error('Для повторяющейся задачи укажите дату старта');
    if (!repeatUntil) throw new Error('Для повторяющейся задачи укажите дату окончания повторения');
    const dates = generateRepeatDates({ start, until: repeatUntil, type: repeatType, weekdays: repeatWeekdays });
    if (!dates.length) throw new Error('По заданным условиям нет дат повторения');
    const durationDays = row.start_date && row.due_date ? diffDays(row.start_date, row.due_date) : 0;
    const ruleDraft = { source_task_id: null, project_id: row.project_id, title: row.title, notes: row.notes || null, status: 'planned', priority: row.priority || 'medium', assignee_id: assigneeIds[0] || null, repeat_type: repeatType, weekdays: repeatType === 'weekdays' ? repeatWeekdays.map(Number) : null, repeat_until: repeatUntil, start_date: start, due_date: row.due_date || start, created_by: state.profile?.id || null };
    const rows = dates.map((date, index) => ({ project_id: row.project_id, title: row.title, notes: row.notes || null, status: 'planned', priority: row.priority || 'medium', start_date: date, due_date: addDays(date, durationDays), assignee_id: assigneeIds[0] || null, sort_order: index, is_favorite: false, start_time: row.start_time || null, end_time: row.end_time || null, duration_minutes: row.duration_minutes || null, is_all_day: Boolean(row.is_all_day), recurrence_date: date }));
    await createRecurringTaskSet(state.sb, ruleDraft, rows, assigneeIds);
    await invalidateWorkspaceData();
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const assigneeIds = data.getAll('assigneeIds').map(String).filter(Boolean);
    const duration = String(data.get('duration_minutes') || '').trim();
    const row = { title: String(data.get('title') || '').trim(), project_id: String(data.get('project_id') || ''), status: String(data.get('status') || 'planned'), priority: String(data.get('priority') || 'medium'), start_date: String(data.get('start_date') || '') || null, due_date: String(data.get('due_date') || '') || null, start_time: String(data.get('start_time') || '') || null, end_time: String(data.get('end_time') || '') || null, duration_minutes: duration ? Number(duration) : null, is_all_day: Boolean(data.get('is_all_day')), notes: String(data.get('notes') || '') || null, assignee_id: assigneeIds[0] || null, assigneeIds };
    await actions.saveTaskData?.(id, row, repeatEnabled ? { createRecurring: createRecurringTask } : undefined);
    onClose();
  }
  async function addComment() { const body = commentText.trim(); if (!body || !id) return; await actions.addTaskComment?.(id, body); setCommentText(''); setMentionState(null); }
  return (
    <div className="modal-backdrop active react-modal-backdrop">
      <form className="modal card task-modal react-task-modal" onSubmit={submit}>
        <div className="modal-head"><div><h3>{id ? 'Редактировать задачу' : 'Новая задача'}</h3><p>{source.title || 'Заполните параметры задачи'}</p></div><button type="button" className="btn ghost" onClick={onClose}>×</button></div>
        <div className="task-modal-layout">
          <div className="form-grid task-form-grid">
            <label className="full">Название<input className="input" name="title" defaultValue={source.title || ''} required /></label>
            <label>Проект<select className="input" name="project_id" defaultValue={source.project_id || ''} required><option value="">Выберите проект</option>{(state.projects || []).map((project) => <option key={project.id} value={project.id}>{project.name || 'Без названия'}</option>)}</select></label>
            <label>Статус<select className="input" name="status" defaultValue={source.status || 'planned'}><option value="planned">Запланировано</option><option value="in_progress">В работе</option><option value="waiting">Ожидание</option><option value="done">Завершено</option><option value="blocked">Заблокировано</option></select></label>
            <label>Приоритет<select className="input" name="priority" defaultValue={source.priority || 'medium'}><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select></label>
            <label>Начало<input className="input" type="date" name="start_date" defaultValue={String(source.start_date || '').slice(0, 10)} /></label>
            <label>Дедлайн<input className="input" type="date" name="due_date" defaultValue={String(source.due_date || '').slice(0, 10)} /></label>
            <label>Начало времени<input className="input" type="time" name="start_time" defaultValue={source.start_time || ''} /></label>
            <label>Окончание времени<input className="input" type="time" name="end_time" defaultValue={source.end_time || ''} /></label>
            <label>Длительность, мин<input className="input" type="number" min="0" step="5" name="duration_minutes" defaultValue={source.duration_minutes || ''} /></label>
            <label className="check-inline task-all-day"><input type="checkbox" name="is_all_day" defaultChecked={Boolean(source.is_all_day)} /> весь день</label>
            <label className="full">Исполнители<select className="input multi" name="assigneeIds" multiple defaultValue={selectedUserValues}>{(state.users || []).filter((user) => user.is_active !== false).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}</select></label>
            <label className="full">Описание<textarea className="input" name="notes" defaultValue={source.notes || ''} rows={4} /></label>
            {!id ? <div className="repeat-box full"><label className="check-inline"><input type="checkbox" checked={repeatEnabled} onChange={(event) => setRepeatEnabled(event.currentTarget.checked)} /> Повторять задачу</label>{repeatEnabled ? <div className="repeat-grid"><label>Тип повтора<select className="input" value={repeatType} onChange={(event) => setRepeatType(event.currentTarget.value)}><option value="daily">Каждый день</option><option value="weekdays">По дням недели</option><option value="weekly">Еженедельно</option><option value="monthly">Ежемесячно</option></select></label><label>Повторять до<input className="input" type="date" value={repeatUntil} onChange={(event) => setRepeatUntil(event.currentTarget.value)} /></label>{repeatType === 'weekdays' ? <div className="weekday-grid full">{[['1','Пн'],['2','Вт'],['3','Ср'],['4','Чт'],['5','Пт'],['6','Сб'],['7','Вс']].map(([value,label]) => <label key={value}><input type="checkbox" checked={repeatWeekdays.includes(value)} onChange={(event) => toggleWeekday(value, event.currentTarget.checked)} /> {label}</label>)}</div> : null}<p className="muted full">Будет создано не больше 370 задач.</p></div> : null}</div> : null}
          </div>
          <aside className="task-comments-panel">
            <h4>Комментарии</h4>
            {id ? <><div className="task-comment-list">{comments.length ? comments.map((comment) => { const user = userById.get(comment.user_id || comment.author_id || comment.created_by); return <div key={comment.id} className="task-comment-item"><div className="task-comment-meta"><b>{user?.display_name || user?.email || 'Пользователь'}</b><span>{notificationTimeLabel(comment)}</span></div><p>{comment.body || comment.message || ''}</p>{canDeleteTaskComment(comment, state.profile) ? <button type="button" onClick={() => actions.deleteTaskComment?.(comment.id)}>Удалить</button> : null}</div>; }) : <div className="empty">Комментариев пока нет.</div>}</div><div className="task-comment-compose"><textarea ref={commentInputRef} className="input" value={commentText} onChange={handleCommentChange} onClick={handleCommentCursor} onKeyUp={handleCommentCursor} onKeyDown={handleCommentKeyDown} placeholder="Добавить комментарий. Для упоминания введите @" rows={3} />{mentionState ? <div className={`mention-suggest ${mentionSuggestions.length ? 'open' : ''}`}>{mentionSuggestions.length ? mentionSuggestions.map((user) => <button key={user.id} type="button" onMouseDown={(event) => { event.preventDefault(); insertMention(user); }}><b>{userMentionLabel(user)}</b><span>{user.email || ''}</span></button>) : <span>Нет совпадений</span>}</div> : null}<button type="button" className="btn secondary" onClick={addComment}>Отправить</button></div></> : <div className="empty">Сохраните задачу, чтобы добавить комментарии.</div>}
          </aside>
        </div>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" type="submit">Сохранить</button></div>
      </form>
    </div>
  );
}

function ProjectModal({ state, actions, onClose }) {
  const ui = useWorkspaceUiStore();
  const id = ui.modals.projectId === '__new__' ? null : ui.modals.projectId;
  const project = id ? (state.projects || []).find((item) => item.id === id) : null;
  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await actions.saveProjectData?.(id || null, { name: String(data.get('name') || '').trim(), description: String(data.get('description') || ''), owner_id: String(data.get('owner_id') || '') || null, status: String(data.get('status') || 'planned'), priority: String(data.get('priority') || 'medium'), start_date: String(data.get('start_date') || '') || null, deadline: String(data.get('deadline') || '') || null, next_step: String(data.get('next_step') || ''), color: String(data.get('color') || '#64748b') });
    onClose();
  }
  return (
    <div className="modal-backdrop active react-modal-backdrop">
      <form className="modal card project-modal react-project-modal" onSubmit={submit}>
        <div className="modal-head"><div><h3>{id ? 'Редактировать проект' : 'Новый проект'}</h3><p>{project?.name || 'Заполните параметры проекта'}</p></div><button type="button" className="btn ghost" onClick={onClose}>×</button></div>
        <div className="form-grid">
          <label>Название<input className="input" name="name" defaultValue={project?.name || ''} required /></label>
          <label>Владелец<select className="input" name="owner_id" defaultValue={project?.owner_id || state.profile?.id || ''}><option value="">Не указан</option>{(state.users || []).map((user) => <option key={user.id} value={user.id}>{user.display_name || user.email || 'Без имени'}</option>)}</select></label>
          <label>Статус<select className="input" name="status" defaultValue={project?.status || 'planned'}><option value="planned">Запланировано</option><option value="in_progress">В работе</option><option value="waiting">Ожидание</option><option value="done">Завершено</option><option value="blocked">Заблокировано</option></select></label>
          <label>Приоритет<select className="input" name="priority" defaultValue={project?.priority || 'medium'}><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select></label>
          <label>Начало<input className="input" type="date" name="start_date" defaultValue={String(project?.start_date || '').slice(0, 10)} /></label>
          <label>Дедлайн<input className="input" type="date" name="deadline" defaultValue={String(project?.deadline || '').slice(0, 10)} /></label>
          <label>Цвет<input className="input" type="color" name="color" defaultValue={project?.color || '#64748b'} /></label>
          <label className="wide">Следующий шаг<input className="input" name="next_step" defaultValue={project?.next_step || ''} /></label>
          <label className="wide">Описание<textarea className="input" name="description" defaultValue={project?.description || ''} rows={4} /></label>
        </div>
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" type="submit">Сохранить</button></div>
      </form>
    </div>
  );
}

function NotificationPanel({ notifications, actions, onClose, onReadAll, onReadOne }) {
  const items = notifications || [];
  const unreadCount = items.filter((item) => !item.is_read).length;
  return <div className="modal-backdrop active react-modal-backdrop"><div className="modal card notification-modal"><div className="modal-head"><div><h3>Оповещения</h3><p>{unreadCount ? `Новых: ${unreadCount}` : 'Новых оповещений нет'}</p></div><div className="notification-modal-actions"><button type="button" className="notification-read-btn" onClick={onReadAll}>Прочитано</button><button type="button" className="btn ghost" onClick={onClose}>×</button></div></div><div className="notification-list">{items.length ? items.map((item) => <button key={item.__id} type="button" className={`notification-row ${item.is_read ? 'read' : 'unread'}`} onClick={() => { onReadOne(item.__id); if (item.task_id) actions.openTask?.(item.task_id); onClose(); }}><span className="notification-kind">{notificationKind(item)}</span><b>{notificationTitle(item)}</b><span>{notificationBody(item)}</span><span className="notification-time">{notificationTimeLabel(item)}</span></button>) : <div className="empty">Оповещений пока нет.</div>}</div></div></div>;
}
function NotificationToasts({ items, onClose }) {
  const item = (items || [])[0];
  React.useEffect(() => {
    if (!item?.__id) return undefined;
    const timer = window.setTimeout(() => onClose(item.__id), 5200);
    return () => window.clearTimeout(timer);
  }, [item?.__id, onClose]);
  if (!item) return null;
  return <div className="notification-toast-stack"><div className="notification-toast" key={item.__id}><b>{notificationTitle(item)}</b><span>{notificationBody(item)}</span><button type="button" onClick={() => onClose(item.__id)}>×</button></div></div>;
}
function AccessModal({ state, onClose }) {
  const ui = useWorkspaceUiStore();
  const projectId = ui.modals.accessProjectId;
  const project = (state.projects || []).find((item) => item.id === projectId);
  const members = (state.members || []).filter((item) => item.project_id === projectId);
  const userById = new Map((state.users || []).map((user) => [user.id, user]));
  return <div className="modal-backdrop active react-modal-backdrop"><div className="modal card notification-modal"><div className="modal-head"><div><h3>Участники проекта</h3><p>{project?.name || 'Проект'}</p></div><button type="button" className="btn ghost" onClick={onClose}>×</button></div><div className="notification-list">{members.length ? members.map((member) => { const user = userById.get(member.user_id); return <div key={`${member.project_id}:${member.user_id}`} className="notification-row"><b>{user?.display_name || user?.email || 'Пользователь'}</b><span>{member.access_role || 'member'}</span></div>; }) : <div className="empty">Участники не указаны.</div>}</div></div></div>;
}
function WorkspaceModals({ state, actions, notificationsOpen, notifications, onCloseNotifications, onReadAllNotifications, onReadOneNotification }) {
  const ui = useWorkspaceUiStore();
  const close = () => ui.closeModals();
  return <>{(ui.modals.taskId !== null || ui.modals.taskDraft !== null) ? <TaskModal state={state} actions={actions} onClose={close} /> : null}{ui.modals.projectId !== null ? <ProjectModal state={state} actions={actions} onClose={close} /> : null}{ui.modals.accessProjectId !== null ? <AccessModal state={state} onClose={close} /> : null}{notificationsOpen ? <NotificationPanel notifications={notifications} actions={actions} onClose={onCloseNotifications} onReadAll={onReadAllNotifications} onReadOne={onReadOneNotification} /> : null}</>;
}

function MainPage() {
  const state = useWorkspaceState();
  const route = useWorkspaceRoute();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [readNotificationIds, setReadNotificationIds] = React.useState(() => { try { return new Set(JSON.parse(localStorage.getItem('workspace.readNotifications') || '[]')); } catch { return new Set(); } });
  const [toasts, setToasts] = React.useState([]);
  const seenNotificationsRef = React.useRef(new Set());
  const seenInitializedRef = React.useRef(false);
  const permissions = getWorkspacePermissionSnapshot(state.profile || null, state.projects || [], state.members || []);
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const notifications = React.useMemo(() => (state.notifications || []).map((item) => { const __id = notificationKey(item); const explicitRead = item?.is_read === true || item?.read_at; return { ...item, __id, is_read: Boolean(explicitRead || readNotificationIds.has(__id)) }; }).sort((left, right) => notificationTs(right) - notificationTs(left)), [state.notifications, readNotificationIds]);
  const shellState = React.useMemo(() => ({ ...state, notifications }), [state, notifications]);
  const shell = createAppShellModel({ state: shellState, view: route.routeId, permissions, statusTitle: state.statusTitle, statusText: state.statusText, hasMaterialsSection: true });
  React.useEffect(() => { localStorage.setItem('workspace.readNotifications', JSON.stringify(Array.from(readNotificationIds).slice(-1000))); }, [readNotificationIds]);
  React.useEffect(() => {
    const ids = notifications.map((item) => item.__id);
    if (!seenInitializedRef.current) { seenNotificationsRef.current = new Set(ids); seenInitializedRef.current = true; return; }
    const fresh = notifications.filter((item) => !item.is_read && !seenNotificationsRef.current.has(item.__id));
    seenNotificationsRef.current = new Set(ids.concat(Array.from(seenNotificationsRef.current)).slice(0, 1000));
    if (fresh.length) setToasts((prev) => fresh.slice(0, 1).concat(prev).slice(0, 1));
  }, [notifications]);
  const markRead = React.useCallback((ids) => { setReadNotificationIds((prev) => { const next = new Set(prev); ids.forEach((id) => next.add(id)); return next; }); }, []);
  const markAllRead = React.useCallback(() => markRead(notifications.map((item) => item.__id)), [markRead, notifications]);
  const selectView = React.useCallback((view) => route.navigateToView(view), [route]);
  const closeToast = React.useCallback((id) => setToasts((items) => items.filter((item) => item.__id !== id)), []);
  function renderPage() {
    switch (route.routeId) {
      case 'overview': return <LazyDashboardPage />;
      case 'tasks': return <LazyTasksPage />;
      case 'projects': return <LazyProjectsPage />;
      case 'materials': return <LazyMaterialsPage />;
      case 'team': return <LazyTeamPage />;
      case 'timeline': return <LazyTimelinePage />;
      case 'chat': return <LazyChatPage />;
      case 'audit': return <LazyAuditPage />;
      case 'settings': return <LazySettingsPage />;
      default: return <EmptyState title="Страница не найдена" />;
    }
  }
  return <div className="app react-pure-app" data-stage="30" data-route={route.routeId}><RoutePerformanceMarker routeId={route.routeId} /><aside className="sidebar react-shell-sidebar"><AppSidebar model={shell} onSelectView={selectView} /></aside><main className="main react-shell-main"><header className="topbar react-shell-topbar"><AppTopbar model={shell} onRefresh={() => invalidateWorkspaceData()} onOpenSettings={() => route.navigateToView('settings')} onCreateProject={() => actions.openProject?.()} onCreateTask={() => actions.openTask?.()} onOpenNotifications={() => setNotificationsOpen(true)} /></header><section className="react-page-panel" data-route={route.routeId}><React.Suspense fallback={<LazyRouteFallback title="Загрузка раздела" />}>{renderPage()}</React.Suspense></section></main><WorkspaceModals state={state} actions={actions} notificationsOpen={notificationsOpen} notifications={notifications} onCloseNotifications={() => setNotificationsOpen(false)} onReadAllNotifications={markAllRead} onReadOneNotification={(id) => markRead([id])} /><NotificationToasts items={toasts} onClose={closeToast} /></div>;
}

export function App() {
  return <AppErrorBoundary><ReactAppProviders><WorkspaceBoot /><MainPage /><PwaLifecycle /></ReactAppProviders></AppErrorBoundary>;
}
