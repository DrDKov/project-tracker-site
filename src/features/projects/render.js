// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').Project} Project */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   esc: (value: unknown) => string,
 *   fmt: (value?: string | null) => string,
 *   rgba: (hex: string | undefined | null, alpha: number) => string,
 *   uname: (userId?: string | null) => string,
 *   vals: (id: string) => string[],
 *   ST: Record<string, string>,
 *   PR: Record<string, string>
 * }} deps
 */
export function createProjectRenderer(deps) {
  const { S, $, esc, fmt, rgba, uname, vals, ST, PR } = deps;

  /** @param {Project} project */
  function cardProject(project) {
    const projectTasks = S.tasks.filter((task) => task.project_id === project.id);
    const progress = Math.round((projectTasks.filter((task) => task.status === 'done').length || 0) / Math.max(1, projectTasks.length) * 100);
    const color = project.color || '#64748b';

    return `<article class="project-card" style="--project-bg:${rgba(color, .12)};border-top:4px solid ${color}"><div class="project-title"><div><h4>${esc(project.name)}</h4><div class="row"><span class="badge">${ST[project.status] || project.status || '—'}</span><span class="badge">${PR[project.priority] || project.priority || '—'}</span></div></div><span style="width:14px;height:14px;border-radius:50%;background:${color};display:inline-block"></span></div><p class="muted">${esc(project.description || 'Без описания')}</p><p><b>Следующий шаг:</b> ${esc(project.next_step || '—')}</p><p class="muted">Владелец: ${esc(uname(project.owner_id))}</p><p class="muted">${fmt(project.start_date)} → ${fmt(project.deadline)}</p><div class="progress"><i style="width:${progress}%"></i></div><div class="actions"><button class="btn sm secondary" data-action="open-project" data-id="${project.id}">Редактировать</button><button class="btn sm primary" data-action="new-task" data-project-id="${project.id}">+ Задача</button><button class="btn sm secondary" data-action="open-access" data-id="${project.id}">Участники</button><button class="btn sm danger" data-action="delete-project" data-id="${project.id}">Удалить</button></div></article>`;
  }

  function renderProjects() {
    const query = ($('projectSearch')?.value || '').toLowerCase();
    const statuses = vals('projectStatusFilter');
    const owners = vals('projectOwnerFilter');
    const list = S.projects.filter((project) => (
      (statuses.includes('all') || statuses.includes(project.status)) &&
      (owners.includes('all') || owners.includes(project.owner_id)) &&
      (!query || [project.name, project.description, project.next_step].join(' ').toLowerCase().includes(query))
    ));
    const grid = $('projectGrid');
    if (grid) grid.innerHTML = list.length ? list.map(cardProject).join('') : '<div class="empty">Нет проектов</div>';
  }

  return { cardProject, renderProjects };
}
