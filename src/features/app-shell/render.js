// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   qa: (selector: string) => Element[],
 *   today: () => string,
 *   cardP: (project: import('../../types/entities.js').Project) => string,
 *   cardT: (task: import('../../types/entities.js').Task) => string,
 *   selectsMaybe: () => void,
 *   admin: () => boolean,
 *   owner: () => boolean,
 *   renderProjects: () => void,
 *   renderTasks: () => void,
 *   renderTeam: () => void,
 *   renderAudit: () => void,
 *   renderTimeline: () => void,
 *   renderChat: () => void,
 *   renderAccess: () => void
 * }} deps
 */
export function createAppShellRenderer(deps) {
  const {
    S,
    $,
    qa,
    today,
    cardP,
    cardT,
    selectsMaybe,
    admin,
    owner,
    renderProjects,
    renderTasks,
    renderTeam,
    renderAudit,
    renderTimeline,
    renderChat,
    renderAccess
  } = deps;

  function render() {
    selectsMaybe();
    qa('.admin-only').forEach((node) => node.classList.toggle('hidden', !admin()));

    const auditButton = /** @type {HTMLElement | null} */ (document.querySelector('.nav [data-view="audit"]'));
    if (auditButton) auditButton.style.display = owner() ? '' : 'none';

    if ($('mProjects')) $('mProjects').textContent = S.projects.length;
    if ($('mOpen')) $('mOpen').textContent = S.tasks.filter((task) => task.status !== 'done').length;
    if ($('mOverdue')) $('mOverdue').textContent = S.tasks.filter((task) => task.status !== 'done' && task.due_date && task.due_date < today()).length;
    if ($('mUsers')) $('mUsers').textContent = S.users.length;
    if ($('overviewProjects')) $('overviewProjects').innerHTML = S.projects.length ? S.projects.slice(0, 8).map(cardP).join('') : '<div class="empty">Нет загруженных проектов</div>';
    if ($('focusList')) $('focusList').innerHTML = S.tasks.filter((task) => task.status !== 'done').slice(0, 8).map(cardT).join('') || '<div class="empty">Нет открытых задач</div>';

    if (S.view === 'projects') renderProjects();
    if (S.view === 'tasks') renderTasks();
    if (S.view === 'team') renderTeam();
    if (S.view === 'audit') renderAudit();
    if (S.view === 'timeline') renderTimeline();
    if (S.view === 'chat') renderChat();
    renderAccess();
  }

  return { render };
}
