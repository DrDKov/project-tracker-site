import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getWorkspaceRouteById, getWorkspaceRoutePath, resolveWorkspaceRoute, type WorkspaceRouteDefinition } from './workspaceRoutes';

export interface WorkspaceRouteHookModel {
  route: WorkspaceRouteDefinition;
  routeId: WorkspaceRouteDefinition['id'];
  navigateToView: (view: string, options?: { replace?: boolean }) => void;
  getPathForView: (view: string) => string;
}

export function useWorkspaceRoute(): WorkspaceRouteHookModel {
  const location = useLocation();
  const navigate = useNavigate();
  const route = React.useMemo(() => resolveWorkspaceRoute(location.pathname), [location.pathname]);

  const navigateToView = React.useCallback((view: string, options: { replace?: boolean } = {}) => {
    const target = getWorkspaceRouteById(view);
    navigate(target.path, { replace: Boolean(options.replace) });
  }, [navigate]);

  return React.useMemo(() => ({
    route,
    routeId: route.id,
    navigateToView,
    getPathForView: getWorkspaceRoutePath
  }), [route, navigateToView]);
}
