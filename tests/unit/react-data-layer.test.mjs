import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

const queryKeys = read('src/react/data/queries/workspaceQueryKeys.ts');
assert.match(queryKeys, /all:\s*\['workspace'\]/);
assert.match(queryKeys, /projects:\s*\(\)\s*=>/);
assert.match(queryKeys, /tasks:\s*\(\)\s*=>/);
assert.match(queryKeys, /chat:\s*\(projectId\?: string \| null\)/);

const queryClient = read('src/shared/query/queryClient.ts');
assert.match(queryClient, /new QueryClient/);
assert.match(queryClient, /staleTime:\s*30_000/);
assert.match(queryClient, /refetchOnWindowFocus:\s*false/);

const uiStore = read('src/shared/store/uiStore.ts');
assert.match(uiStore, /create<WorkspaceUiState>/);
assert.match(uiStore, /subscribeWithSelector/);
assert.match(uiStore, /setActiveView/);
assert.match(uiStore, /setTaskBoardMode/);
assert.match(uiStore, /openTask/);
assert.match(uiStore, /setFilter/);

const providers = read('src/react/app/ReactAppProviders.tsx');
assert.match(providers, /WorkspaceQueryProvider/);
assert.match(providers, /WorkspaceStoreProvider/);
assert.match(providers, /WorkspaceDataBridge/);

const island = read('src/react/core/createReactIsland.tsx');
assert.match(island, /ReactAppProviders/);
assert.match(island, /<ReactAppProviders>\{element\}<\/ReactAppProviders>/);

console.log('react data layer tests passed');
