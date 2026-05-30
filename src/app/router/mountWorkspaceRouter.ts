import { installWorkspaceRouteSync } from './routeSync';

export function mountWorkspaceRouter() {
  installWorkspaceRouteSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWorkspaceRouter);
else mountWorkspaceRouter();
