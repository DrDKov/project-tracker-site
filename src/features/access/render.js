// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   esc: (value: unknown) => string,
 *   uname: (userId?: string | null) => string
 * }} deps
 */
export function createAccessRenderer(deps) {
  const { S, $, esc, uname } = deps;

  function renderAccess() {
    const box = $('accessList');
    const projectId = $('accessProjectId')?.value;
    if (!box || !projectId) return;

    const rows = S.members.filter((member) => member.project_id === projectId);
    box.innerHTML = rows.length
      ? `<table class="access-table"><thead><tr><th>Участник</th><th>Права</th><th></th></tr></thead><tbody>${rows.map((member) => `<tr><td>${esc(uname(member.user_id))}</td><td>${esc(member.access_role)}</td><td><button type="button" class="btn sm danger" data-action="remove-access" data-id="${member.id}">Удалить</button></td></tr>`).join('')}</tbody></table>`
      : '<div class="empty">Участники проекта не добавлены отдельно</div>';
  }

  return { renderAccess };
}
