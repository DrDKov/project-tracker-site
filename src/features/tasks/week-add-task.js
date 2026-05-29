/*
 * Week-view task creation helper.
 *
 * Opens the existing task modal and pre-fills start/due dates when the user clicks a
 * day-level add button in the weekly task view.
 */
(() => {
  if (window.__WEEK_ADD_TASK_INTEGRATED__) return;
  window.__WEEK_ADD_TASK_INTEGRATED__ = 1;

  const byId = (id) => document.getElementById(id);

  function setTaskDates(date) {
    const id = byId('taskId');
    const start = byId('taskStart');
    const due = byId('taskDue');
    if (id) id.value = '';
    if (start) start.value = date;
    if (due) due.value = date;
  }

  function openTaskForDate(date) {
    const newTaskButton = byId('newTaskBtn') || byId('quickTaskBtn');
    if (newTaskButton) {
      newTaskButton.click();
    } else {
      const modal = byId('taskModal');
      if (modal && modal.showModal) modal.showModal();
    }

    [0, 80, 200, 400].forEach((delay) => setTimeout(() => setTaskDates(date), delay));
  }

  function handleAddTaskClick(event) {
    const button = event.target && event.target.closest
      ? event.target.closest('.week-add-task-btn,[data-action="new-task-on-date"]')
      : null;
    if (!button) return;

    const date = button.dataset.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    openTaskForDate(date);
  }

  document.addEventListener('click', handleAddTaskClick, true);
  document.addEventListener('pointerdown', handleAddTaskClick, true);
})();
