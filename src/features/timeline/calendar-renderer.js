import { createTimelineViewModel } from '../../react/timeline/timelineModel.ts';
import { mountTimelinePage } from '../../react/timeline/mountTimelinePage.tsx';

export function createTimelineCalendarRenderer(deps) {
  const { S, $, qa, esc, fmt, pcolor, rgba, tids, uname, pname, ST, PR, pad, D, today, ymd, add, selectsMaybe } = deps;

  function timelineTools() {
    return `<div class="timeline-filterbar" id="timelineFilterbar"><input class="input" id="timelineSearch" placeholder="Поиск"><select class="input" id="timelineTypeFilter" multiple size="4"><option value="all">Все типы</option><option value="project">Проекты</option><option value="task">Задачи</option></select><select class="input" id="timelineProjectFilter" multiple size="4"><option value="all">Все проекты</option>${S.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><select class="input" id="timelineAssigneeFilter" multiple size="4"><option value="all">Все исполнители</option>${S.users.map(u => `<option value="${u.id}">${esc(u.display_name || u.email)}</option>`).join('')}</select><select class="input" id="timelineStatusFilter" multiple size="4"><option value="all">Все статусы</option><option value="open">Открытые</option><option value="overdue">Просроченные</option><option value="done">Завершено</option></select><select class="input" id="timelinePriorityFilter" multiple size="4"><option value="all">Все приоритеты</option><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select><button class="btn secondary" data-action="timeline-today">Сегодня</button><button class="btn secondary" data-action="timeline-reset">Сбросить</button></div><div class="timeline-stats" id="timelineStats"></div>`;
  }

  /* Calendar timeline v1 start */
  const TL0 = 6;
  const TL1 = 22;
  const TLS = 30;
  const TLD = 60;
  const TLP = 1.1;

  // The visual calendar has a separate all-day row above the timed grid.
  // Timed events and grid lines are positioned inside .timeline-time-grid,
  // while left-side hour labels are positioned in .timeline-time-col.
  // Offset labels by one visual hour so 09:00 label aligns with events at 09:00.
  const TL_LABEL_OFFSET_MINUTES = 60;

  function tm(v) {
    if (!v) return null;
    const a = String(v).slice(0, 5).split(':').map(Number);
    return Number.isFinite(a[0]) ? a[0] * 60 + a[1] : null;
  }

  function mt(n) {
    n = Math.max(0, Math.min(1439, Math.round(n)));
    return pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  }

  function dur(t) {
    const a = tm(t.start_time);
    const b = tm(t.end_time);
    return a != null && b != null && b > a ? b - a : Number(t.duration_minutes) > 0 ? Number(t.duration_minutes) : TLD;
  }

  function ensureTaskCalendarUi() {
    if ($('taskStartTime')) return;
    const due = $('taskDue');
    const g = due && due.closest ? due.closest('.form-grid') : null;
    if (!due || !g) return;
    const w = document.createElement('div');
    w.className = 'full task-calendar-box';
    w.innerHTML = '<label class="task-calendar-head"><input id="taskAllDay" type="checkbox"> <span>Весь день / без конкретного времени</span></label><div class="task-calendar-time-grid"><label><span>Время начала</span><input class="input" id="taskStartTime" type="time"></label><label><span>Время окончания</span><input class="input" id="taskEndTime" type="time"></label><label><span>Длительность, мин</span><input class="input" id="taskDurationMinutes" type="number" min="1" step="5" placeholder="60"></label></div>';
    const l = due.closest('label');
    l && l.parentNode ? l.parentNode.insertBefore(w, l.nextSibling) : g.appendChild(w);
  }

  function syncTaskCalendarUi() {
    ensureTaskCalendarUi();
    const a = !!$('taskAllDay')?.checked;
    ['taskStartTime', 'taskEndTime', 'taskDurationMinutes'].forEach(id => {
      const e = $(id);
      if (e) e.disabled = a;
    });
  }

  function readTaskCalendarFields() {
    ensureTaskCalendarUi();
    const all = !!$('taskAllDay')?.checked;
    const st = $('taskStartTime')?.value || null;
    const en = $('taskEndTime')?.value || null;
    const dr = $('taskDurationMinutes')?.value || '';
    const du = dr ? Number(dr) : null;
    if (all) return { is_all_day: true, start_time: null, end_time: null, duration_minutes: null };
    if (en && !st) throw Error('Укажите время начала');
    if (st && en && en <= st) throw Error('Время окончания должно быть позже времени начала');
    if (du != null && (!Number.isFinite(du) || du <= 0)) throw Error('Длительность должна быть больше 0');
    return { is_all_day: false, start_time: st, end_time: en, duration_minutes: du };
  }

  function fillTaskCalendarFields(t) {
    ensureTaskCalendarUi();
    if ($('taskStartTime')) $('taskStartTime').value = t?.start_time ? String(t.start_time).slice(0, 5) : '';
    if ($('taskEndTime')) $('taskEndTime').value = t?.end_time ? String(t.end_time).slice(0, 5) : '';
    if ($('taskDurationMinutes')) $('taskDurationMinutes').value = t?.duration_minutes || '';
    if ($('taskAllDay')) $('taskAllDay').checked = !!t?.is_all_day;
    syncTaskCalendarUi();
  }

  function wstart(v) {
    const d = D(v || today());
    const w = d.getDay() || 7;
    d.setDate(d.getDate() - w + 1);
    return ymd(d);
  }

  function inDay(t, d) {
    const a = t.start_date || t.due_date || t.recurrence_date;
    const b = t.due_date || t.start_date || t.recurrence_date;
    return !!(a || b) && a <= d && d <= b;
  }

  function tf() {
    return {
      q: ($('tlQ')?.value || '').toLowerCase(),
      p: $('tlP')?.value || 'all',
      u: $('tlU')?.value || 'all',
      s: $('tlS')?.value || 'all',
      r: $('tlR')?.value || 'all',
      done: !!$('tlDone')?.checked
    };
  }

  function passT(t, f) {
    if (t.deleted_at) return false;
    if (!f.done && t.status === 'done') return false;
    if (f.p !== 'all' && t.project_id !== f.p) return false;
    if (f.s !== 'all' && t.status !== f.s) return false;
    if (f.r !== 'all' && t.priority !== f.r) return false;
    if (f.u !== 'all' && !tids(t).includes(f.u)) return false;
    if (f.q && !([t.title, t.notes, pname(t.project_id), ...tids(t).map(uname)].join(' ').toLowerCase().includes(f.q))) return false;
    return true;
  }

  function tt(t) {
    const x = t.start_time ? String(t.start_time).slice(0, 5) + (t.end_time ? '–' + String(t.end_time).slice(0, 5) : '') : '';
    return (x ? '<b>' + esc(x) + '</b> ' : '') + (t.is_favorite ? '★ ' : '') + (t.recurrence_rule_id ? '↻ ' : '') + esc(t.title) + '<small>' + esc(pname(t.project_id)) + '</small>';
  }

  function ev(t, st = null) {
    const s = st != null ? st : tm(t.start_time);
    const d = dur(t);
    return { task: t, a: s, b: s + d, l: 0, n: 1, auto: st != null };
  }

  function ov(a, b) {
    return a.a < b.b && b.a < a.b;
  }

  function lane(es) {
    es = es.slice().sort((a, b) => a.a - b.a || a.b - b.b);
    const lanes = [];
    es.forEach(e => {
      let i = lanes.findIndex(x => x <= e.a);
      if (i < 0) {
        i = lanes.length;
        lanes.push(e.b);
      } else lanes[i] = e.b;
      e.l = i;
      e.n = Math.max(1, lanes.length);
    });
    es.forEach(e => e.n = Math.max(e.n, lanes.length));
    return es;
  }

  function place(ut, td) {
    const ds = TL0 * 60;
    const de = TL1 * 60;
    const pl = [];
    const uo = [];
    for (const t of ut) {
      let slot = null;
      for (let m = ds; m + TLD <= de; m += TLS) {
        const c = { a: m, b: m + TLD };
        if (!td.some(x => ov({ a: x.a, b: x.b }, c)) && !pl.some(x => ov({ a: x.a, b: x.b }, c))) {
          slot = m;
          break;
        }
      }
      slot == null ? uo.push(t) : pl.push(ev(t, slot));
    }
    pl.forEach(x => x.auto = true);
    return { pl, uo };
  }

  function est(e) {
    const ds = TL0 * 60;
    const de = TL1 * 60;
    const a = Math.max(ds, e.a);
    const b = Math.min(de, e.b);
    const top = (a - ds) * TLP;
    const h = Math.max(24, (b - a) * TLP);
    return '--top:' + top + 'px;--height:' + h + 'px;--lane:' + (e.l || 0) + ';--lanes:' + (e.n || 1) + ';--accent:' + pcolor(e.task.project_id) + ';--bg:' + rgba(pcolor(e.task.project_id), .18);
  }

  function cardE(e) {
    const t = e.task;
    return '<div class="timeline-event timed ' + (e.auto ? 'untimed-auto ' : '') + (t.status === 'done' ? 'done ' : '') + '" style="' + est(e) + '" data-action="tl-open" data-id="' + t.id + '"><div>' + tt(t) + '</div>' + (e.auto ? '<em>без времени</em>' : '') + '</div>';
  }

  function hourTop(h) {
    return ((h - TL0) * 60) * TLP;
  }

  function hourLabelTop(h) {
    return ((h - TL0) * 60 + TL_LABEL_OFFSET_MINUTES) * TLP;
  }

  function timelineFilters() {
    return {
      query: ($('tlQ')?.value || '').toLowerCase(),
      projectId: $('tlP')?.value || 'all',
      userId: $('tlU')?.value || 'all',
      status: $('tlS')?.value || 'all',
      priority: $('tlR')?.value || 'all',
      showDone: !!$('tlDone')?.checked
    };
  }

  function createModel() {
    S.timelineDate = S.timelineDate || today();
    return createTimelineViewModel({
      tasks: S.tasks,
      projects: S.projects,
      users: S.users,
      timelineDate: S.timelineDate,
      filters: timelineFilters(),
      today: today(),
      statusLabels: ST,
      priorityLabels: PR,
      projectName: pname,
      projectColor: pcolor,
      rgba,
      userName: uname,
      taskUserIds: tids,
      D,
      add,
      fmt,
      config: { startHour: TL0, endHour: TL1, slotMinutes: TLS, defaultDurationMinutes: TLD, pixelsPerMinute: TLP, labelOffsetMinutes: TL_LABEL_OFFSET_MINUTES }
    });
  }

  function renderCalendarTimeline() {
    // Compatibility API: the timeline is mounted by renderTimeline(), but tests
    // and older callers can still request a serializable model.
    return createModel();
  }

  /* Calendar timeline v1 end */

  function renderTimeline() {
    const e = $('timeline');
    if (!e) return;
    mountTimelinePage(e, createModel());
    selectsMaybe();
  }

  return { TL0, TL1, TLS, TLD, TLP, mt, tm, dur, ensureTaskCalendarUi, syncTaskCalendarUi, readTaskCalendarFields, fillTaskCalendarFields, renderCalendarTimeline, renderTimeline };
}
