import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
function fail(message){console.error(`Production hardening check failed: ${message}`);process.exit(1)}
function read(file){return fs.readFileSync(path.join(ROOT,file),'utf8')}
function exists(file){return fs.existsSync(path.join(ROOT,file))}

const required = [
  'src/shared/production/ErrorBoundary.tsx',
  'src/shared/production/LazyRouteFallback.tsx',
  'src/shared/production/logger.ts',
  'src/shared/production/performance.ts',
  'src/shared/production/index.ts',
  'src/app/lazyPages.tsx',
  'src/styles/production-hardening.css'
];
for (const file of required) if (!exists(file)) fail(`missing Stage 30 file: ${file}`);

const app = read('src/app/App.tsx');
if (!app.includes('AppErrorBoundary')) fail('App must be wrapped in AppErrorBoundary');
if (!app.includes('React.Suspense')) fail('App must use Suspense around lazy pages');
if (!app.includes('LazyRouteFallback')) fail('App must use LazyRouteFallback');
if (!app.includes('markWorkspacePerformance')) fail('App must mark boot/route performance');
if (/from ['"]\.\.\/pages\//.test(app)) fail('App must not statically import page modules after Stage 30');

const lazy = read('src/app/lazyPages.tsx');
for (const token of ['React.lazy','DashboardPage','TasksPage','ProjectsPage','MaterialsPage','TimelinePage','ChatPage']) {
  if (!lazy.includes(token)) fail(`lazyPages.tsx missing ${token}`);
}

const vite = read('vite.config.js');
for (const token of ['manualChunks','vendor-react','vendor-query','feature-tasks','feature-timeline','feature-materials','feature-chat']) {
  if (!vite.includes(token)) fail(`vite config missing production chunk token ${token}`);
}

const mainCss = read('src/styles/main.css');
if (!mainCss.includes("./production-hardening.css")) fail('main.css must import production-hardening.css');

const pkg = JSON.parse(read('package.json'));
if (!pkg.scripts?.['check:production']) fail('package.json must expose check:production');
if (!pkg.scripts?.check?.includes('check:production')) fail('npm run check must include check:production');

console.log('Production hardening check passed: error boundary, lazy routes, chunking and performance utilities active.');
