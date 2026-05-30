import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }

assert.ok(exists('src/react/data/queries/workspaceBootstrapQuery.ts'), 'Stage 26C bootstrap query module must exist');
assert.ok(exists('src/repositories/workspace/workspaceRepository.ts'), 'Stage 26C workspace repository must exist');
assert.equal(exists('src/app/data-loader.js'), false, 'Stage 26F removes legacy data-loader.js');

const bootstrap = read('src/react/data/queries/workspaceBootstrapQuery.ts');
for (const token of ['loadWorkspaceBootstrapData', 'loadWorkspaceTasksQueryData', 'createWorkspaceBootstrapStatePatch', 'syncWorkspaceBootstrapToStore', 'useWorkspaceBootstrapQuery', 'useWorkspaceBootstrapQuerySync', 'createWorkspaceRepositorySet']) {
  assert.match(bootstrap, new RegExp(token), `workspace bootstrap query layer must expose ${token}`);
}
assert.equal(/from ['"].*services\//.test(bootstrap), false, 'bootstrap query layer must not import services directly');

const runtime = read('src/app/workspaceRuntime.ts');
assert.match(runtime, /loadWorkspaceBootstrapData/, 'workspaceRuntime must use query-owned bootstrap loader');
assert.match(runtime, /createWorkspaceBootstrapStatePatch/, 'workspaceRuntime must use query-owned state patch projection');
assert.equal(/fetchProjectsRequired|fetchReferenceData|fetchTasksPaged|fetchActivityLog/.test(runtime), false, 'workspaceRuntime must not call legacy service loaders directly');

const bridge = read('src/react/data/bridge/WorkspaceDataBridge.tsx');
assert.match(bridge, /useWorkspaceBootstrapQuerySync/, 'WorkspaceDataBridge must sync Query bootstrap into appStore');
const keys = read('src/react/data/queries/workspaceQueryKeys.ts');
assert.match(keys, /bootstrap:\s*\(\)\s*=>/, 'Stage 26C requires a workspace bootstrap query key');
const realtimeInvalidation = read('src/shared/realtime/realtimeInvalidation.ts');
assert.match(realtimeInvalidation, /workspaceQueryKeys\.bootstrap\(\)/, 'realtime invalidation should invalidate the bootstrap query');
console.log('query data-loader migration tests passed');
