import { createRecurringTaskSet } from '../../services/tasks.service.js';

export function createTaskRecurrenceFeature(deps) {
  const { S, $, qa, D, ymd, add, diff } = deps;

  function ensureTaskRecurrenceUi() {
    if ($('taskRepeatEnabled')) return;
    const due = $('taskDue');
    const grid = due && due.closest ? due.closest('.form-grid') : null;
    if (!due || !grid) return;

    const wrap = document.createElement('div');
    wrap.className = 'full task-recurrence-box';
    wrap.innerHTML = '<label class="task-recurrence-head"><input id="taskRepeatEnabled" type="checkbox"> <span>Повторяющаяся задача</span></label><div id="taskRepeatOptions" class="task-repeat-options hidden"><label><span>Тип повторения</span><select class="input" id="taskRepeatType"><option value="daily">Ежедневно</option><option value="weekdays">По дням недели</option><option value="weekly">Раз в неделю</option><option value="monthly">Раз в месяц</option></select></label><label><span>Повторять до</span><input class="input" id="taskRepeatUntil" type="date"></label><div id="taskRepeatWeekdaysBox" class="task-repeat-weekdays full hidden"><label><input class="task-repeat-weekday" type="checkbox" value="1">Пн</label><label><input class="task-repeat-weekday" type="checkbox" value="2">Вт</label><label><input class="task-repeat-weekday" type="checkbox" value="3">Ср</label><label><input class="task-repeat-weekday" type="checkbox" value="4">Чт</label><label><input class="task-repeat-weekday" type="checkbox" value="5">Пт</label><label><input class="task-repeat-weekday" type="checkbox" value="6">Сб</label><label><input class="task-repeat-weekday" type="checkbox" value="7">Вс</label></div></div><div id="taskRepeatExistingNote" class="task-repeat-existing-note"></div>';

    const dueLabel = due.closest('label');
    if (dueLabel && dueLabel.parentNode) dueLabel.parentNode.insertBefore(wrap, dueLabel.nextSibling);
    else grid.appendChild(wrap);
  }

  function recurrenceWeekdayNumber(dateStr) {
    const day = D(dateStr).getDay();
    return day === 0 ? 7 : day;
  }

  function recurrenceLastDayOfMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function recurrenceAddMonthsClamped(dateStr, months, anchorDay) {
    const date = D(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + months;
    const targetYear = year + Math.floor(month / 12);
    const targetMonth = ((month % 12) + 12) % 12;
    const day = Math.min(anchorDay || date.getDate(), recurrenceLastDayOfMonth(targetYear, targetMonth));
    return ymd(new Date(targetYear, targetMonth, day));
  }

  function generateRecurrenceDates(rule) {
    const type = rule.repeat_type;
    const start = rule.start_date;
    const until = rule.repeat_until;
    const days = (rule.weekdays || []).map(Number).filter((day) => day >= 1 && day <= 7);
    const out = [];

    if (!start || !until) return out;
    if (until < start) return out;

    if (type === 'daily') {
      for (let date = start; date <= until; date = add(date, 1)) out.push(date);
    } else if (type === 'weekdays') {
      const set = new Set(days);
      if (!set.size) throw new Error('Выберите дни недели для повторения');
      for (let date = start; date <= until; date = add(date, 1)) {
        if (set.has(recurrenceWeekdayNumber(date))) out.push(date);
      }
    } else if (type === 'weekly') {
      for (let date = start; date <= until; date = add(date, 7)) out.push(date);
    } else if (type === 'monthly') {
      const anchor = D(start).getDate();
      for (let index = 0, date = start; date <= until; index += 1, date = recurrenceAddMonthsClamped(start, index, anchor)) out.push(date);
    } else {
      throw new Error('Неизвестный тип повторения');
    }

    if (out.length > 370) throw new Error('Слишком много повторений: максимум 370 задач');
    return out;
  }

  function taskRecurrenceWeekdays() {
    ensureTaskRecurrenceUi();
    return qa('.task-repeat-weekday:checked').map((item) => Number(item.value)).filter((day) => day >= 1 && day <= 7);
  }

  function taskRecurrenceEnabled() {
    ensureTaskRecurrenceUi();
    return Boolean($('taskRepeatEnabled')?.checked);
  }

  function syncTaskRecurrenceUi() {
    ensureTaskRecurrenceUi();
    const enabled = taskRecurrenceEnabled();
    const type = $('taskRepeatType')?.value || 'daily';
    const box = $('taskRepeatOptions');
    const weekdays = $('taskRepeatWeekdaysBox');
    const until = $('taskRepeatUntil');

    if (box) box.classList.toggle('hidden', !enabled);
    if (weekdays) weekdays.classList.toggle('hidden', !(enabled && type === 'weekdays'));
    if ($('taskRepeatType')) $('taskRepeatType').disabled = !enabled;
    if (until) until.disabled = !enabled;
    qa('.task-repeat-weekday').forEach((item) => { item.disabled = !enabled || type !== 'weekdays'; });
  }

  function setupTaskRecurrenceFields(task, id) {
    ensureTaskRecurrenceUi();
    const enabled = $('taskRepeatEnabled');
    if (!enabled) return;

    const existing = Boolean(id);
    enabled.checked = false;
    enabled.disabled = existing;
    if ($('taskRepeatType')) {
      $('taskRepeatType').value = 'daily';
      $('taskRepeatType').disabled = true;
    }
    if ($('taskRepeatUntil')) {
      $('taskRepeatUntil').value = '';
      $('taskRepeatUntil').disabled = true;
    }
    qa('.task-repeat-weekday').forEach((item) => {
      item.checked = false;
      item.disabled = true;
    });

    const note = $('taskRepeatExistingNote');
    if (note) {
      note.textContent = existing && task?.recurrence_rule_id
        ? 'Это экземпляр повторяющейся задачи. Изменения применяются только к этой задаче.'
        : existing
          ? 'Повторение доступно только при создании новой задачи.'
          : '';
    }
    syncTaskRecurrenceUi();
  }

  async function createRecurringTasks(baseRow, selected) {
    const start = baseRow.start_date || baseRow.due_date;
    const until = $('taskRepeatUntil')?.value || '';
    const type = $('taskRepeatType')?.value || 'daily';
    const weekdays = type === 'weekdays' ? taskRecurrenceWeekdays() : null;

    if (!start) throw new Error('Для повторяющейся задачи укажите дату старта');
    if (!until) throw new Error('Для повторяющейся задачи укажите дату окончания повторения');
    if (until < start) throw new Error('Дата окончания повторения не может быть раньше даты старта');

    const durationDays = baseRow.start_date && baseRow.due_date ? Math.max(0, diff(baseRow.start_date, baseRow.due_date)) : 0;
    const ruleDraft = {
      source_task_id: null,
      project_id: baseRow.project_id,
      title: baseRow.title,
      notes: baseRow.notes || null,
      status: 'planned',
      priority: baseRow.priority || 'medium',
      assignee_id: selected[0] || null,
      repeat_type: type,
      weekdays,
      repeat_until: until,
      start_date: start,
      due_date: baseRow.due_date || start,
      created_by: S.profile?.id || null
    };

    const dates = generateRecurrenceDates(ruleDraft);
    if (!dates.length) throw new Error('По заданным условиям нет дат повторения');

    const rows = dates.map((date, index) => ({
      project_id: baseRow.project_id,
      title: baseRow.title,
      notes: baseRow.notes || null,
      status: 'planned',
      priority: baseRow.priority || 'medium',
      start_date: date,
      due_date: add(date, durationDays),
      assignee_id: selected[0] || null,
      sort_order: index,
      is_favorite: false,
      start_time: baseRow.start_time || null,
      end_time: baseRow.end_time || null,
      duration_minutes: baseRow.duration_minutes || null,
      is_all_day: Boolean(baseRow.is_all_day),
      recurrence_date: date
    }));

    return createRecurringTaskSet(S.sb, ruleDraft, rows, selected);
  }

  function bind() {
    if (window.__TASK_RECURRENCE_V118__) return;
    window.__TASK_RECURRENCE_V118__ = true;
    document.addEventListener('change', (event) => {
      if (event.target && ['taskRepeatEnabled', 'taskRepeatType'].includes(event.target.id)) syncTaskRecurrenceUi();
    }, true);
    setTimeout(ensureTaskRecurrenceUi, 0);
  }

  return {
    ensureTaskRecurrenceUi,
    taskRecurrenceEnabled,
    syncTaskRecurrenceUi,
    setupTaskRecurrenceFields,
    createRecurringTasks,
    generateRecurrenceDates,
    bind
  };
}
