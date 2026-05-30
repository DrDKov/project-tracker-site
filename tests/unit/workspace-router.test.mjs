import assert from 'node:assert/strict';
import {
  WORKSPACE_ROUTES,
  getWorkspaceRouteById,
  getWorkspaceRouteHash,
  getWorkspaceRoutePath,
  isWorkspaceRouteId,
  normalizeWorkspacePath,
  resolveWorkspaceRoute,
  routeIdFromHash
} from '../../src/app/router/workspaceRoutes.ts';

assert.equal(WORKSPACE_ROUTES.length, 9, 'workspace router should define all application pages');
assert.deepEqual(WORKSPACE_ROUTES.map((route) => route.id), [
  'overview',
  'projects',
  'tasks',
  'timeline',
  'chat',
  'team',
  'materials',
  'audit',
  'settings'
]);

assert.equal(normalizeWorkspacePath(''), '/');
assert.equal(normalizeWorkspacePath('#/tasks'), '/tasks');
assert.equal(normalizeWorkspacePath('/overview'), '/');
assert.equal(resolveWorkspaceRoute('#/projects').id, 'projects');
assert.equal(resolveWorkspaceRoute('/unknown').id, 'overview');
assert.equal(routeIdFromHash('#/materials?source=pwa'), 'materials');
assert.equal(getWorkspaceRoutePath('timeline'), '/timeline');
assert.equal(getWorkspaceRouteHash('chat'), '#/chat');
assert.equal(getWorkspaceRouteById('audit').requires, 'audit');
assert.equal(getWorkspaceRouteById('materials').requires, 'materials');
assert.equal(isWorkspaceRouteId('tasks'), true);
assert.equal(isWorkspaceRouteId('does-not-exist'), false);

console.log('workspace router model tests passed');
