import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const events = read('src/shared/realtime/realtimeEvents.ts');
assert.match(events, /WORKSPACE_REALTIME_EVENT\s*=\s*'workspace:realtime-change'/);
assert.match(events, /dispatchWorkspaceRealtimeChange/);
assert.match(events, /subscribeWorkspaceRealtimeChanges/);

const invalidation = read('src/shared/realtime/realtimeInvalidation.ts');
assert.match(invalidation, /queryKeysForRealtimeTable/);
assert.match(invalidation, /case 'tasks'/);
assert.match(invalidation, /workspaceQueryKeys\.tasks\(\)/);
assert.match(invalidation, /case 'project_messages'/);
assert.match(invalidation, /workspaceQueryKeys\.chat\(projectId\)/);
assert.match(invalidation, /case 'material_files'/);
assert.match(invalidation, /workspaceQueryKeys\.materials\(\)/);
assert.match(invalidation, /invalidateRealtimeChange/);

const client = read('src/shared/realtime/realtimeClient.ts');
assert.match(client, /normalizeSupabaseRealtimePayload/);
assert.match(client, /createWorkspaceRealtimeSubscription/);
assert.match(client, /createWorkspaceRealtimeChannel/);

const provider = read('src/shared/realtime/WorkspaceRealtimeProvider.tsx');
assert.match(provider, /useWorkspaceRealtimeInvalidation/);

const appProviders = read('src/react/app/ReactAppProviders.tsx');
assert.match(appProviders, /WorkspaceRealtimeProvider/);
assert.match(appProviders, /<WorkspaceRealtimeProvider>/);

const runtimeBridge = read('src/app/realtime-bridge.js');
assert.match(runtimeBridge, /createWorkspaceRealtimeSubscription/);
assert.match(runtimeBridge, /dispatchWorkspaceRealtimeChange/);
assert.doesNotMatch(runtimeBridge, /createWorkspaceRealtimeChannel/);
assert.doesNotMatch(runtimeBridge, /removeRealtimeChannel/);
assert.match(runtimeBridge, /workspace-realtime-v126d/);
assert.doesNotMatch(runtimeBridge, /function\s+rtUpsert/);
assert.doesNotMatch(runtimeBridge, /function\s+rtRemove/);
assert.doesNotMatch(runtimeBridge, /scheduleRender\(/);
assert.doesNotMatch(runtimeBridge, /loadTasksSafe\(/);
assert.doesNotMatch(runtimeBridge, /fetchRealtimeSnapshot/);
assert.doesNotMatch(runtimeBridge, /S\.tasks\s*=/);
assert.doesNotMatch(runtimeBridge, /S\.projects\s*=/);
assert.doesNotMatch(runtimeBridge, /S\.assignees\s*=/);
assert.doesNotMatch(runtimeBridge, /S\.subtasks\s*=/);
assert.doesNotMatch(runtimeBridge, /S\.taskComments\s*=/);

console.log('realtime bridge model tests passed');
