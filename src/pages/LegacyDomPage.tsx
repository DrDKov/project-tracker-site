import React from 'react';
import type { WorkspaceRouteDefinition } from '../app/router/workspaceRoutes';

export interface LegacyDomPageProps {
  route: WorkspaceRouteDefinition;
}

/**
 * Stage 23 page boundary.
 *
 * The visible page body is still rendered in the existing DOM sections while
 * the migration bridge is alive. This component gives the router/page layer a
 * typed page artifact without duplicating or replacing those sections yet.
 */
export function LegacyDomPage({ route }: LegacyDomPageProps) {
  return <span hidden data-react-page={route.id} data-legacy-section={route.elementId} />;
}
