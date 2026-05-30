import assert from 'node:assert/strict';
import fs from 'node:fs';

const actionAdapter = fs.readFileSync('src/react/actions/workspaceActions.ts', 'utf8');
assert.equal(actionAdapter.includes('window.__WorkspaceApp'), false, 'workspaceActions must not read window.__WorkspaceApp');
assert.equal(actionAdapter.includes('runtimeApp'), false, 'workspaceActions must not use runtimeApp');
assert.equal(actionAdapter.includes('createWorkspaceRepositorySet'), true, 'workspaceActions must use repositories');
assert.equal(actionAdapter.includes('createTaskActionController'), true, 'workspaceActions must use task controller');
assert.equal(fs.existsSync('src/app/runtime-compatibility.js'), false, 'runtime compatibility bridge is removed in Stage 26F');
console.log('react action bridge removal tests passed');
