/*
 * Calendar timeline event handlers.
 *
 * Stage 26F no longer uses the legacy runtime compatibility API.
 * This module keeps calendar-specific DOM events out of the core runtime.
 */
(() => {
  if (window.__TIMELINE_CALENDAR_HANDLERS_V1__) return;
  window.__TIMELINE_CALENDAR_HANDLERS_V1__ = 1;

  const getApp = () => null;
  const byId = (id) => document.getElementById(id);

  document.addEventListener('change', (event) => {
    const app = getApp();
    if (!app || !event.target) return;

    if (event.target.id === 'taskAllDay') app.syncTaskCalendarUi();
    if (['tlP', 'tlU', 'tlS', 'tlR', 'tlDone'].includes(event.target.id) && app.view === 'timeline') {
      app.renderTimeline();
    }
  }, true);

  document.addEventListener('input', (event) => {
    const app = getApp();
    if (!app || !event.target) return;
    if (event.target.id === 'tlQ' && app.view === 'timeline') app.renderTimeline();
  }, true);

  document.addEventListener('click', (event) => {
    const app = getApp();
    if (!app) return;

    const button = event.target.closest?.('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    if (!String(action).startsWith('tl-')) return;

    if (action === 'tl-prev') {
      app.timelineDate = app.add(app.timelineDate || app.today(), -7);
      app.renderTimeline();
      return;
    }

    if (action === 'tl-next') {
      app.timelineDate = app.add(app.timelineDate || app.today(), 7);
      app.renderTimeline();
      return;
    }

    if (action === 'tl-today') {
      app.timelineDate = app.today();
      app.renderTimeline();
      return;
    }

    if (action === 'tl-open') {
      event.preventDefault();
      event.stopPropagation();
      app.openTask(button.dataset.id);
      return;
    }

    if (action === 'tl-add-day') {
      event.preventDefault();
      event.stopPropagation();
      app.openTask(null);
      const date = button.dataset.date;
      const start = byId('taskStart');
      const due = byId('taskDue');
      if (start) start.value = date;
      if (due) due.value = date;
      app.fillTaskCalendarFields({});
      return;
    }

    if (action === 'tl-empty') {
      if (event.target.closest('.timeline-event')) return;
      const grid = event.target.closest('.timeline-time-grid');
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const minutes = app.TL0 * 60 + Math.round((y / app.TLP) / app.TLS) * app.TLS;
      const time = app.mt(minutes);
      const date = grid.dataset.date;

      app.openTask(null);
      const start = byId('taskStart');
      const due = byId('taskDue');
      if (start) start.value = date;
      if (due) due.value = date;
      app.fillTaskCalendarFields({
        start_time: time,
        end_time: app.mt(minutes + app.TLD),
        duration_minutes: app.TLD,
        is_all_day: false
      });
    }
  }, true);
})();
