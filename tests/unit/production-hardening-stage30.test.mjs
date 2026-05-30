import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const app = read('src/app/App.tsx');
assert.ok(app.includes('AppErrorBoundary'), 'App should be wrapped in AppErrorBoundary');
assert.ok(app.includes('React.Suspense'), 'App should use Suspense for lazy routes');
assert.ok(app.includes('LazyRouteFallback'), 'App should use a production loading boundary');
assert.ok(app.includes('measureWorkspacePerformance'), 'App should measure boot/route performance');
assert.equal(/from ['"]\.\.\/pages\//.test(app), false, 'App should not statically import page modules');

const lazyPages = read('src/app/lazyPages.tsx');
assert.ok((lazyPages.match(/React\.lazy/g) || []).length >= 8, 'lazy pages should use React.lazy for route-level code splitting');
assert.ok(lazyPages.includes('../pages/TasksPage'), 'TasksPage should be lazy loaded');
assert.ok(lazyPages.includes('../pages/MaterialsPage'), 'MaterialsPage should be lazy loaded');

const vite = read('vite.config.js');
assert.ok(vite.includes('manualChunks'), 'Vite should define production manual chunks');
assert.ok(vite.includes('vendor-react'), 'React vendor chunk should exist');
assert.ok(vite.includes('vendor-query'), 'TanStack Query vendor chunk should exist');
assert.ok(vite.includes('feature-tasks'), 'task feature chunk should exist');

const performance = read('src/shared/production/performance.ts');
assert.ok(performance.includes('PERFORMANCE_BUDGETS'), 'performance budgets should be explicit');
assert.ok(performance.includes('scheduleIdleTask'), 'idle scheduling helper should exist');
assert.ok(performance.includes('createDebouncedCallback'), 'debounced callback helper should exist');

const logger = read('src/shared/production/logger.ts');
assert.ok(logger.includes('logWorkspaceEvent'), 'production logger should expose logWorkspaceEvent');
assert.ok(logger.includes('import.meta.env.PROD'), 'logger should be production-aware');

console.log('production hardening stage 30 tests passed');
