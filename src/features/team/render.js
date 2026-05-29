// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   esc: (value: unknown) => string,
 *   canManageUsers: () => boolean,
 *   canEditWorkspaceUser: (user: AppUser) => boolean,
 *   canDeactivateWorkspaceUser: (user: AppUser) => boolean
 * }} deps
 */
export function createTeamRenderer(deps) {
  const { S, $, esc, canManageUsers, canEditWorkspaceUser, canDeactivateWorkspaceUser } = deps;

  function renderTeam() {
    const grid = $('userGrid');
    if (!grid) return;

    grid.innerHTML = S.users.map((user) => `<article class="user-card"><span class="avatar avatar-lg">${esc((user.display_name || user.email || '?').slice(0, 2).toUpperCase())}</span><div><b>${esc(user.display_name || user.email)}</b><p>${esc(user.role)}</p><p class="muted">${esc(user.email || '')}</p>${canManageUsers() ? `<div class="actions">${canEditWorkspaceUser(user) ? `<button class="btn sm secondary" data-action="open-user" data-id="${user.id}">Редактировать</button>` : ''}${canDeactivateWorkspaceUser(user) ? `<button class="btn sm danger" data-action="deactivate-user" data-id="${user.id}">Деактивировать</button>` : ''}</div>` : ''}</div></article>`).join('') || '<div class="empty">Нет пользователей</div>';
  }

  return { renderTeam };
}
