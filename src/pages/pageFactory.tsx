import React from 'react';
import { getWorkspaceRouteById, type WorkspaceRouteId } from '../app/router/workspaceRoutes';
import { LegacyDomPage } from './LegacyDomPage';

export function createWorkspaceLegacyPage(id: WorkspaceRouteId) {
  const route = getWorkspaceRouteById(id);
  function WorkspaceLegacyPage() {
    return <LegacyDomPage route={route} />;
  }
  WorkspaceLegacyPage.displayName = `${route.id[0].toUpperCase()}${route.id.slice(1)}Page`;
  return WorkspaceLegacyPage;
}
