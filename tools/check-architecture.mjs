import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function fail(message) {
  console.error(`Architecture check failed: ${message}`);
  process.exit(1);
}

function exists(file) {
  return fs.existsSync(file);
}

function walk(dir, predicate = () => true) {
  const out = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, '$1');
}

const retiredFiles = [
  'src/features/notifications/polling-fallback.js'
];
for (const file of retiredFiles) {
  if (exists(path.join(ROOT, file))) fail(`retired legacy file still exists: ${file}`);
}

const mainEntry = read(path.join(SRC, 'app', 'main.tsx'));
const moduleLoader = read(path.join(SRC, 'app', 'workspaceModuleLoader.ts'));
const indexHtml = read(path.join(ROOT, 'index.html'));
if (exists(path.join(SRC, 'app', 'bootstrap.js'))) fail('Stage 26E requires legacy bootstrap.js to be removed');
if (!indexHtml.includes('/src/app/main.tsx')) fail('index.html must load main.tsx after Stage 26E');
if (!indexHtml.includes('id="root"')) fail('index.html must contain #root after Stage 26E');
if (!mainEntry.includes('createRoot')) fail('main.tsx must create the React root after Stage 26E');
if (moduleLoader.includes('polling-fallback')) fail('workspace module loader must not load notification polling fallback');
if (moduleLoader.includes('react-app-shell')) fail('Stage 26F module loader must not load React AppShell as legacy island');

const sourceFiles = walk(SRC, (file) => /\.(js|jsx|ts|tsx)$/.test(file));
for (const file of sourceFiles) {
  const content = read(file);
  if (content.includes('POLLING_RESCUE') || content.includes('__POLLING_RESCUE_LITE__')) {
    fail(`retired polling rescue token found in ${rel(file)}`);
  }
}

const reactFiles = walk(path.join(SRC, 'react'), (file) => /\.(js|jsx|ts|tsx)$/.test(file));
const domAllowed = new Set([
  'src/react/core/createReactIsland.tsx',
  'src/react/app-shell/mountAppShell.tsx',
  'src/react/tasks/mountTaskModal.tsx',
  'src/react/modals/mountWorkspaceModals.tsx',
  'src/react/state/workspaceStoreAdapter.ts',
  'src/react/actions/workspaceActions.ts',
  'src/react/pwa/PwaLifecycle.tsx'
]);

for (const file of reactFiles) {
  const r = rel(file);
  const content = read(file);
  if (/from\s+['\"]\.\.\/\.\.\/features\//.test(content) || /from\s+['\"]\.\.\/features\//.test(content)) {
    fail(`React module imports legacy features directly: ${r}`);
  }
  const touchesDom = /\b(document|window)\./.test(content) || content.includes('__WorkspaceApp');
  if (touchesDom && !domAllowed.has(r)) {
    fail(`React module touches browser globals outside adapter/mount boundary: ${r}`);
  }
}


const dataActionRetiredReactFiles = [
  'src/react/tasks/TaskCard.tsx',
  'src/react/tasks/TaskBoard.tsx',
  'src/react/projects/ProjectCard.tsx',
  'src/react/team/UserCard.tsx',
  'src/react/chat/ChatPage.tsx'
];
for (const file of dataActionRetiredReactFiles) {
  const full = path.join(ROOT, file);
  if (!exists(full)) fail(`Stage 18 React event-owned file is missing: ${file}`);
  if (read(full).includes('data-action')) fail(`React event-owned file must not use data-action: ${file}`);
}

const repositoryFiles = walk(path.join(SRC, 'repositories'), (file) => /\.(ts|tsx)$/.test(file));
if (!repositoryFiles.length) fail('repository layer is missing');
for (const file of repositoryFiles) {
  const r = rel(file);
  const content = read(file);
  if (/\.from\s*\(/.test(content) || /\.rpc\s*\(/.test(content) || /\.storage\s*\./.test(content)) {
    fail(`repository must delegate to service layer, raw Supabase call found in ${r}`);
  }
}


const controllerFiles = walk(path.join(SRC, 'controllers'), (file) => /\.(ts|tsx)$/.test(file));
if (!controllerFiles.length) fail('controller layer is missing');
for (const file of controllerFiles) {
  const r = rel(file);
  const content = read(file);
  if (/\.from\s*\(/.test(content) || /\.rpc\s*\(/.test(content) || /\.storage\s*\./.test(content)) {
    fail(`controller must delegate to repository layer, raw Supabase call found in ${r}`);
  }
  if (/from\s+['"](?:\.\.\/)+services\//.test(content)) {
    fail(`controller must not import services directly: ${r}`);
  }
}

const runtimeActionsFile = path.join(SRC, 'features', 'actions', 'runtime-actions.js');
if (!exists(runtimeActionsFile)) fail('runtime action adapter is missing');
const runtimeActionsContent = read(runtimeActionsFile);
if (/from\s+['"](?:\.\.\/)+services\//.test(runtimeActionsContent)) {
  fail('runtime action adapter must delegate to controllers/repositories, not import services directly');
}


const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
if (!pkg.dependencies?.['@tanstack/react-query']) fail('Stage 19 requires @tanstack/react-query as a runtime dependency');
if (!pkg.dependencies?.zustand) fail('Stage 19 requires zustand as a runtime dependency');

const queryProviderFile = path.join(SRC, 'shared', 'query', 'QueryProvider.tsx');
const queryClientFile = path.join(SRC, 'shared', 'query', 'queryClient.ts');
const uiStoreFile = path.join(SRC, 'shared', 'store', 'uiStore.ts');
const reactProvidersFile = path.join(SRC, 'react', 'app', 'ReactAppProviders.tsx');
for (const file of [queryProviderFile, queryClientFile, uiStoreFile, reactProvidersFile]) {
  if (!exists(file)) fail(`Stage 19 data layer file is missing: ${rel(file)}`);
}
if (!read(queryProviderFile).includes('QueryClientProvider')) fail('Workspace query provider must use QueryClientProvider');
if (!read(queryClientFile).includes('new QueryClient')) fail('Workspace query client must create a QueryClient');
if (!read(uiStoreFile).includes('zustand')) fail('Workspace UI store must use Zustand');
if (!read(reactProvidersFile).includes('WorkspaceDataBridge')) fail('React providers must mount WorkspaceDataBridge');
if (!read(path.join(SRC, 'react', 'core', 'createReactIsland.tsx')).includes('ReactAppProviders')) {
  fail('React islands must be wrapped by ReactAppProviders');
}



const realtimeFiles = [
  'src/shared/realtime/realtimeEvents.ts',
  'src/shared/realtime/realtimeInvalidation.ts',
  'src/shared/realtime/realtimeClient.ts',
  'src/shared/realtime/useWorkspaceRealtime.ts',
  'src/shared/realtime/WorkspaceRealtimeProvider.tsx'
];
for (const file of realtimeFiles) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 20 realtime layer file is missing: ${file}`);
}
const realtimeInvalidation = read(path.join(ROOT, 'src/shared/realtime/realtimeInvalidation.ts'));
if (!realtimeInvalidation.includes('queryKeysForRealtimeTable')) fail('Stage 20 realtime invalidation must map realtime tables to query keys');
if (!realtimeInvalidation.includes('workspaceQueryKeys.tasks()')) fail('Stage 20 realtime invalidation must invalidate task queries');
if (!realtimeInvalidation.includes('workspaceQueryKeys.materials()')) fail('Stage 20 realtime invalidation must invalidate material queries');
const realtimeProvider = read(path.join(ROOT, 'src/shared/realtime/WorkspaceRealtimeProvider.tsx'));
if (!realtimeProvider.includes('useWorkspaceRealtimeInvalidation')) fail('Stage 20 realtime provider must subscribe to realtime invalidation events');
const reactProviders = read(path.join(ROOT, 'src/react/app/ReactAppProviders.tsx'));
if (!reactProviders.includes('WorkspaceRealtimeProvider')) fail('React providers must mount WorkspaceRealtimeProvider');
const realtimeBridge = read(path.join(ROOT, 'src/app/realtime-bridge.js'));
if (!realtimeBridge.includes('createWorkspaceRealtimeSubscription')) fail('runtime realtime bridge must use the Stage 20 shared realtime subscription wrapper');
if (!realtimeBridge.includes('dispatchWorkspaceRealtimeChange')) fail('runtime realtime bridge must dispatch typed realtime change events');
if (realtimeBridge.includes('createWorkspaceRealtimeChannel') || realtimeBridge.includes('removeRealtimeChannel')) {
  fail('runtime realtime bridge must not import low-level realtime service helpers directly after Stage 20');
}



const repositoryErrorFile = path.join(SRC, 'repositories', 'repositoryError.ts');
const workspaceRepositorySetFile = path.join(SRC, 'repositories', 'workspaceRepositories.ts');
for (const file of [repositoryErrorFile, workspaceRepositorySetFile]) {
  if (!exists(file)) fail(`Stage 21 repository hardening file is missing: ${rel(file)}`);
}
const repositoryErrorContent = read(repositoryErrorFile);
if (!repositoryErrorContent.includes('class RepositoryError extends Error')) fail('Stage 21 requires RepositoryError typed boundary');
if (!repositoryErrorContent.includes('repositoryCall')) fail('Stage 21 requires repositoryCall wrapper');
const workspaceRepositorySetContent = read(workspaceRepositorySetFile);
if (!workspaceRepositorySetContent.includes('createWorkspaceRepositorySet')) fail('Stage 21 requires createWorkspaceRepositorySet factory');
if (!workspaceRepositorySetContent.includes('Object.freeze')) fail('Stage 21 repository set must be immutable');

for (const file of repositoryFiles) {
  const r = rel(file);
  if (!/Repository\.ts$/.test(r)) continue;
  const content = read(file);
  if (!content.includes('assertRepositoryClient')) fail(`repository must assert Supabase client: ${r}`);
  if (!content.includes('repositoryCall') && !content.includes('repositorySync')) fail(`repository must wrap service calls with repository error boundary: ${r}`);
}

const stage21RuntimeActions = read(path.join(SRC, 'features', 'actions', 'runtime-actions.js'));
if (!stage21RuntimeActions.includes('createWorkspaceRepositorySet')) fail('runtime action adapter must use Stage 21 repository set factory');
if (/create(Task|Project|User|Delete)Repository/.test(stage21RuntimeActions)) fail('runtime action adapter must not instantiate individual repositories after Stage 21');

const stage21WorkspaceQueries = read(path.join(SRC, 'react', 'data', 'queries', 'workspaceQueries.ts'));
if (!stage21WorkspaceQueries.includes('createWorkspaceRepositorySet')) fail('query layer must use Stage 21 repository set factory');
if (/create(Task|Project|User)Repository/.test(stage21WorkspaceQueries)) fail('query layer must not instantiate individual repositories after Stage 21');



const stage22ReactLegacyFiles = walk(path.join(SRC, 'react'), (file) => /\.(js|jsx)$/.test(file));
if (stage22ReactLegacyFiles.length) {
  fail(`Stage 22 requires src/react to be TypeScript-only, found: ${stage22ReactLegacyFiles.map(rel).join(', ')}`);
}
const stage22RequiredFiles = [
  'src/react/core/createReactIsland.tsx',
  'src/react/actions/workspaceActions.ts',
  'src/react/pwa/PwaLifecycle.tsx',
  'src/react/state/workspaceStoreAdapter.ts',
  'src/react/data/workspaceDataLayer.ts',
  'src/react/tasks/taskCardModel.ts',
  'src/react/tasks/TaskCard.tsx',
  'src/react/projects/projectModel.ts',
  'src/react/materials/materialsModel.ts',
  'src/react/team/teamModel.ts',
  'src/react/timeline/timelineModel.ts',
  'src/react/chat/chatModel.ts',
  'src/react/app-shell/appShellModel.ts'
];
for (const file of stage22RequiredFiles) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 22 TypeScript migration file is missing: ${file}`);
}
const unitRunner = read(path.join(ROOT, 'tools', 'run-unit-tests.mjs'));
if (!unitRunner.includes('tsx')) fail('Stage 22 unit runner must execute tests through tsx');
const tsConfig = JSON.parse(read(path.join(ROOT, 'tsconfig.json')));
if (tsConfig.compilerOptions?.allowImportingTsExtensions !== true) fail('Stage 22 requires allowImportingTsExtensions in tsconfig');




const stage23Files = [
  'src/app/router/workspaceRoutes.ts',
  'src/app/router/routeSync.ts',
  'src/app/router/useWorkspaceRoute.tsx',
  'src/app/router/WorkspaceRouterProvider.tsx',
  'src/app/router/mountWorkspaceRouter.ts',
  'src/pages/DashboardPage.tsx',
  'src/pages/TasksPage.tsx',
  'src/pages/ProjectsPage.tsx',
  'src/pages/MaterialsPage.tsx',
  'src/pages/TeamPage.tsx',
  'src/pages/TimelinePage.tsx',
  'src/pages/ChatPage.tsx',
  'src/pages/SettingsPage.tsx'
];
for (const file of stage23Files) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 23 router/page architecture file is missing: ${file}`);
}
const stage23Routes = read(path.join(ROOT, 'src/app/router/workspaceRoutes.ts'));
if (!stage23Routes.includes('WORKSPACE_ROUTES')) fail('Stage 23 must define WORKSPACE_ROUTES');
if (!stage23Routes.includes("path: '/tasks'")) fail('Stage 23 router must define /tasks route');
if (!stage23Routes.includes("path: '/materials'")) fail('Stage 23 router must define /materials route');
const stage23ReactProviders = read(path.join(ROOT, 'src/react/app/ReactAppProviders.tsx'));
if (!stage23ReactProviders.includes('WorkspaceRouterProvider')) fail('ReactAppProviders must mount WorkspaceRouterProvider after Stage 23');
const stage23ModuleLoader = read(path.join(ROOT, 'src/app/workspaceModuleLoader.ts'));
if (stage23ModuleLoader.includes('workspace-router')) fail('Stage 26F module loader must not load workspace-router as legacy module');
const stage23AppShellMount = read(path.join(ROOT, 'src/react/app-shell/mountAppShell.tsx'));
if (!stage23AppShellMount.includes('useWorkspaceRoute')) fail('React AppShell must use route hook after Stage 23');




const stage24RequiredFiles = [
  'src/shared/ui/Button.tsx',
  'src/shared/ui/Badge.tsx',
  'src/shared/ui/Card.tsx',
  'src/shared/ui/Form.tsx',
  'src/shared/ui/Tabs.tsx',
  'src/shared/ui/Dropdown.tsx',
  'src/shared/ui/EmptyState.tsx',
  'src/shared/ui/Modal.tsx',
  'src/shared/ui/index.ts',
  'src/styles/design-system.css'
];
for (const file of stage24RequiredFiles) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 24 design system file is missing: ${file}`);
}
const stage24MainCss = read(path.join(ROOT, 'src/styles/main.css'));
if (!stage24MainCss.includes("@import './design-system.css';")) fail('Stage 24 requires design-system.css to be imported by main.css');
const stage24UiIndex = read(path.join(ROOT, 'src/shared/ui/index.ts'));
for (const token of ['Button', 'Badge', 'Card', 'Dropdown', 'EmptyState', 'Form', 'Modal', 'Tabs']) {
  if (!stage24UiIndex.includes(token)) fail(`Stage 24 shared/ui index must export ${token}`);
}
const stage24DesignSystemConsumers = [
  'src/react/app-shell/AppShell.tsx',
  'src/react/projects/ProjectCard.tsx',
  'src/react/team/UserCard.tsx',
  'src/react/notifications/NotificationCenter.tsx'
];
for (const file of stage24DesignSystemConsumers) {
  if (!read(path.join(ROOT, file)).includes("shared/ui")) fail(`Stage 24 consumer must use shared/ui: ${file}`);
}





const stage25Files = {
  dashboardMount: 'src/react/dashboard/DashboardOverview.tsx',
  auditMount: 'src/react/audit/AuditLog.tsx'
};
for (const file of Object.values(stage25Files)) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 25 React presentation file is missing: ${file}`);
}
if (!read(path.join(ROOT, 'docs/runtime-decomposition.json')).includes('removedInStage25')) fail('Stage 25 runtime inventory must document Stage 25 removals');

// Stage 26F pure React runtime cutover
const forbiddenRuntimeFiles = [
  'src/app/runtime-core.js',
  'src/app/runtime-compatibility.js',
  'src/app/runtime.js',
  'src/app/data-loader.js',
  'src/app/session-controller.js',
  'src/app/legacy/legacyDomTemplate.ts',
  'src/app/bootstrap.js'
];
for (const file of forbiddenRuntimeFiles) {
  if (exists(path.join(ROOT, file))) fail(`Stage 26F requires legacy runtime file to be deleted: ${file}`);
}
const stage26FInventory = JSON.parse(read(path.join(ROOT, 'docs/runtime-decomposition.json')));
if (stage26FInventory.stage !== '26F') fail('runtime inventory stage must be 26F after final compatibility removal');
if (stage26FInventory.runtimeFile !== null) fail('runtime inventory runtimeFile must be null after Stage 26F');
if (!Array.isArray(stage26FInventory.removedInStage26F) || !stage26FInventory.removedInStage26F.some((item) => item.name === 'src/app/runtime-compatibility.js')) {
  fail('Stage 26F inventory must document runtime-compatibility.js deletion');
}
const stage26FApp = read(path.join(ROOT, 'src/app/App.tsx'));
const stage26FMain = read(path.join(ROOT, 'src/app/main.tsx'));
const stage26FModules = read(path.join(ROOT, 'src/app/workspaceModuleLoader.ts'));
if (!stage26FMain.includes('createRoot')) fail('main.tsx must mount React root');
if (stage26FApp.includes('legacyDomTemplate') || stage26FApp.includes('bootWorkspaceModulesSafe')) fail('Stage 26F App must not mount legacy template or boot legacy module sequence');
if (stage26FModules.includes('runtime') || stage26FModules.includes('features/tasks') || stage26FModules.includes('features/materials')) fail('Stage 26F module loader must not load legacy feature/runtime modules');
const stage26FActionAdapter = stripComments(read(path.join(ROOT, 'src/react/actions/workspaceActions.ts')));
for (const forbidden of ['window.__WorkspaceApp', 'runtimeApp', 'runtimeState', 'runtimeClient', 'document.getElementById']) {
  if (stage26FActionAdapter.includes(forbidden)) fail(`Stage 26F React action adapter must not use legacy runtime token: ${forbidden}`);
}
const stage26FStoreAdapter = stripComments(read(path.join(ROOT, 'src/react/state/workspaceStoreAdapter.ts')));
if (stage26FStoreAdapter.includes('__WorkspaceApp')) fail('Stage 26F store adapter must not read window.__WorkspaceApp');
const allSource = sourceFiles.map((file) => [rel(file), stripComments(read(file))]);
for (const [file, content] of allSource) {
  if (file === 'src/types/globals.d.ts') continue;
  if (content.includes('window.__WorkspaceApp')) fail(`Stage 26F forbids window.__WorkspaceApp in source file: ${file}`);
  if (content.includes('runtime-compatibility')) fail(`Stage 26F forbids runtime-compatibility references in source file: ${file}`);
}



// Stage 27 expanded tests
const stage27RequiredTests = [
  'tests/unit/controller-behavior.test.mjs',
  'tests/unit/storage-and-assignment-services.test.mjs',
  'tests/unit/pure-react-runtime-contract.test.mjs',
  'tests/unit/router-page-rendering-contract.test.mjs',
  'tests/unit/query-realtime-integration.test.mjs',
  'tests/smoke/react-navigation.spec.js',
  'tests/smoke/supabase-stub.js',
  'tools/check-test-coverage.mjs'
];
for (const file of stage27RequiredTests) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 27 expanded test artifact is missing: ${file}`);
}
const stage27Pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
if (!stage27Pkg.scripts?.check?.includes('npm run check:tests')) fail('Stage 27 requires npm run check to include check:tests');
if (!stage27Pkg.scripts?.['check:tests']?.includes('check-test-coverage')) fail('Stage 27 requires check:tests script');



const stage28Files = [
  'docs/supabase-security-audit.md',
  'docs/supabase-security-matrix.json',
  'supabase/migrations/005_security_hardening_audit.sql',
  'tools/check-supabase-security.mjs',
  'tests/unit/supabase-security-audit.test.mjs'
];
for (const file of stage28Files) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 28 security audit file is missing: ${file}`);
}
const stage28Migration = read(path.join(ROOT, 'supabase/migrations/005_security_hardening_audit.sql'));
if (!stage28Migration.includes('workspace_security_baseline_report')) fail('Stage 28 migration must expose workspace_security_baseline_report');
if (!stage28Migration.includes('revoke all on table') || !stage28Migration.includes('from anon')) fail('Stage 28 migration must revoke protected workspace tables from anon');
if (!stage28Migration.includes("where id in ('project-chat-files', 'workspace-materials')")) fail('Stage 28 migration must keep workspace buckets private');



// Stage 29 PWA and mobile polish
const stage29Files = [
  'src/shared/pwa/pwaClient.ts',
  'src/react/pwa/PwaLifecycle.tsx',
  'src/react/pwa/PwaInstallPrompt.tsx',
  'src/react/pwa/PwaUpdateBanner.tsx',
  'src/react/pwa/PwaOfflineBanner.tsx',
  'src/styles/pwa-mobile.css',
  'public/offline.html',
  'tests/unit/pwa-polish-stage29.test.mjs'
];
for (const file of stage29Files) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 29 PWA polish file is missing: ${file}`);
}
const stage29Sw = read(path.join(ROOT, 'public/service-worker.js'));
if (!stage29Sw.includes('CACHE_VERSION') || !stage29Sw.includes('pt-pwa-')) fail('Stage 29 service worker must use explicit cache versioning');
if (!stage29Sw.includes('SKIP_WAITING')) fail('Stage 29 service worker must support update activation by message');
if (!stage29Sw.includes('./offline.html')) fail('Stage 29 service worker must cache offline fallback');
if (!stage29Sw.includes('isSupabaseRequest')) fail('Stage 29 service worker must bypass Supabase requests');
const stage29App = read(path.join(ROOT, 'src/app/App.tsx'));
if (!stage29App.includes('PwaLifecycle')) fail('Stage 29 App must mount PwaLifecycle');
const stage29MainCss = read(path.join(ROOT, 'src/styles/main.css'));
if (!stage29MainCss.includes("@import './pwa-mobile.css';")) fail('Stage 29 main.css must import pwa-mobile.css');
const stage29PwaClient = read(path.join(ROOT, 'src/shared/pwa/pwaClient.ts'));
for (const token of ['beforeinstallprompt', 'registerWorkspaceServiceWorker', 'requestServiceWorkerUpdate', 'isStandaloneDisplayMode']) {
  if (!stage29PwaClient.includes(token)) fail(`Stage 29 PWA client must include ${token}`);
}


// Stage 30 performance and production hardening
const stage30Files = [
  'src/shared/production/ErrorBoundary.tsx',
  'src/shared/production/LazyRouteFallback.tsx',
  'src/shared/production/logger.ts',
  'src/shared/production/performance.ts',
  'src/app/lazyPages.tsx',
  'src/styles/production-hardening.css',
  'tools/check-production-hardening.mjs',
  'tests/unit/production-hardening-stage30.test.mjs'
];
for (const file of stage30Files) {
  if (!exists(path.join(ROOT, file))) fail(`Stage 30 production hardening file is missing: ${file}`);
}
const stage30App = read(path.join(ROOT, 'src/app/App.tsx'));
if (!stage30App.includes('AppErrorBoundary')) fail('Stage 30 App must mount AppErrorBoundary');
if (!stage30App.includes('React.Suspense')) fail('Stage 30 App must use Suspense for lazy routes');
if (!stage30App.includes('markWorkspacePerformance')) fail('Stage 30 App must mark performance');
if (/from ['"]\.\.\/pages\//.test(stage30App)) fail('Stage 30 App must not statically import page modules');
const stage30Vite = read(path.join(ROOT, 'vite.config.js'));
if (!stage30Vite.includes('manualChunks') || !stage30Vite.includes('vendor-react')) fail('Stage 30 Vite config must define production chunks');
const stage30Pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
if (!stage30Pkg.scripts?.check?.includes('npm run check:production')) fail('Stage 30 requires npm run check to include check:production');

console.log(`Architecture check passed: ${reactFiles.length} React files, ${repositoryFiles.length} repository files, ${controllerFiles.length} controller files, retired fallback removed, Stage 19 data layer active, Stage 20 realtime layer active, Stage 21 repository layer hardened, Stage 22 TypeScript migration active, Stage 23 router/page architecture active, Stage 24 design system active, Stage 25 legacy render adapter reduction active, Stage 26F runtime compatibility removed, Stage 27 expanded tests active, Stage 28 Supabase security audit active, Stage 29 PWA/mobile polish active, Stage 30 performance/production hardening active.`);
