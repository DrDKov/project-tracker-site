import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACE_ROUTES, resolveWorkspaceRoute, getWorkspaceRouteHash } from '../../src/app/router/workspaceRoutes.ts';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const pageFiles = [
  'src/pages/DashboardPage.tsx',
  'src/pages/TasksPage.tsx',
  'src/pages/ProjectsPage.tsx',
  'src/pages/MaterialsPage.tsx',
  'src/pages/TeamPage.tsx',
  'src/pages/TimelinePage.tsx',
  'src/pages/ChatPage.tsx',
  'src/pages/AuditPage.tsx',
  'src/pages/SettingsPage.tsx'
];

for (const file of pageFiles) {
  const content = read(file);
  assert.equal(content.includes('LegacyDomPage'), false, `${file} must not render LegacyDomPage after pure React cutover`);
  assert.equal(content.includes('createWorkspaceLegacyPage'), false, `${file} must not use legacy page factory after pure React cutover`);
}

const app = read('src/app/App.tsx');
for (const page of ['DashboardPage', 'TasksPage', 'ProjectsPage', 'MaterialsPage', 'TeamPage', 'TimelinePage', 'ChatPage', 'AuditPage', 'SettingsPage']) {
  assert.ok(app.includes(page), `App.tsx should render ${page} directly`);
}

const routeIds = WORKSPACE_ROUTES.map((route) => route.id);
assert.deepEqual(routeIds.slice(0, 4), ['overview', 'projects', 'tasks', 'timeline']);
assert.equal(resolveWorkspaceRoute('#/tasks').id, 'tasks');
assert.equal(getWorkspaceRouteHash('materials'), '#/materials');
assert.equal(WORKSPACE_ROUTES.some((route) => route.requires === 'materials'), true);
assert.equal(WORKSPACE_ROUTES.some((route) => route.requires === 'audit'), true);

console.log('router and page rendering contract tests passed');
