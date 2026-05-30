// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */

import { createTeamPageViewModel } from '../../react/team/teamModel.ts';
import { mountTeamPage } from '../../react/team/mountTeamPage.tsx';
import { createWorkspaceReactActions } from '../../react/actions/workspaceActions.ts';

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => HTMLElement | null,
 *   esc: (value: unknown) => string,
 *   canManageUsers: () => boolean,
 *   canEditWorkspaceUser: (user: AppUser) => boolean,
 *   canDeactivateWorkspaceUser: (user: AppUser) => boolean
 * }} deps
 */
export function createTeamRenderer(deps) {
  const { S, $ , canManageUsers, canEditWorkspaceUser, canDeactivateWorkspaceUser } = deps;
  const reactActions = createWorkspaceReactActions();

  function renderTeam() {
    const grid = $('userGrid');
    if (!grid) return;

    const model = createTeamPageViewModel({
      users: Array.isArray(S.users) ? S.users : [],
      projects: Array.isArray(S.projects) ? S.projects : [],
      members: Array.isArray(S.members) ? S.members : [],
      currentProfile: S.profile || null,
      canManageUsers: canManageUsers(),
      canEditUser: canEditWorkspaceUser,
      canDeactivateUser: canDeactivateWorkspaceUser
    });

    mountTeamPage(grid, model, {
      openUser: reactActions.openUser,
      deactivateUser: reactActions.deactivateUser
    });
  }

  return { renderTeam };
}
