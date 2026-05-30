import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { createWorkspaceReactActions } from '../react/actions/workspaceActions';
import { createTeamPageViewModel } from '../react/team/teamModel';
import { TeamPage as TeamPageView } from '../react/team/TeamPage';
import { canDeactivateUser, canEditUser, canManageUsers } from '../core/permissions/index.js';

export function TeamPage() {
  const state = useWorkspaceState();
  const actions = React.useMemo(() => createWorkspaceReactActions(), [state.sb, state.profile?.id]);
  const model = createTeamPageViewModel({ users: state.users || [], projects: state.projects || [], members: state.members || [], currentProfile: state.profile || null, canManageUsers: canManageUsers(state.profile), canEditUser: (user) => canEditUser(state.profile, user), canDeactivateUser: (user) => canDeactivateUser(state.profile, user) });
  return <section className="panel react-team-page"><TeamPageView model={model} actions={actions} /></section>;
}
export default TeamPage;
