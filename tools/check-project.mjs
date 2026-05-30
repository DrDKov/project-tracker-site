import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const INDEX = path.join(ROOT, 'index.html');

function fail(message) {
  console.error(`Project check failed: ${message}`);
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

function parseHtmlRefs(html) {
  const refs = [];
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/g
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(html))) refs.push(m[1]);
  }
  return refs;
}

function isExternal(ref) {
  return /^(https?:)?\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('mailto:') || ref.startsWith('#');
}

function resolveViteRef(ref) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.startsWith('/src/')) return path.join(ROOT, clean.slice(1));
  if (clean.startsWith('/')) return path.join(PUBLIC, clean.slice(1));
  if (clean.startsWith('./')) return path.join(PUBLIC, clean.slice(2));
  return path.join(PUBLIC, clean);
}

function checkJsSyntax(file) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) fail(`JS syntax error in ${path.relative(ROOT, file)}\n${res.stderr || res.stdout}`);
}

function parseLocalImports(js) {
  const imports = [];
  const patterns = [
    /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /new\s+Worker\s*\(\s*new\s+URL\s*\(\s*["']([^"']+)["']/g
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(js))) imports.push(m[1]);
  }
  return imports;
}

function checkImports(file) {
  const js = fs.readFileSync(file, 'utf8');
  for (const spec of parseLocalImports(js)) {
    if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
    if (spec.endsWith('.css')) {
      const cssFile = path.resolve(path.dirname(file), spec);
      if (!exists(cssFile)) fail(`Missing CSS import ${spec} in ${path.relative(ROOT, file)}`);
      continue;
    }
    const target = spec.startsWith('/') ? path.join(ROOT, spec.slice(1)) : path.resolve(path.dirname(file), spec);
    const candidates = [target, `${target}.js`, path.join(target, 'index.js')];
    if (!candidates.some(exists)) fail(`Missing JS import ${spec} in ${path.relative(ROOT, file)}`);
  }
}

function assertJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${path.relative(ROOT, file)}: ${error.message}`);
  }
}

function checkPwa(html) {
  const manifestFile = path.join(PUBLIC, 'manifest.webmanifest');
  const serviceWorkerFile = path.join(PUBLIC, 'service-worker.js');
  const iconFiles = [
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/icons/maskable-512.png'
  ];

  if (!exists(manifestFile)) fail('public/manifest.webmanifest is missing');
  if (!exists(serviceWorkerFile)) fail('public/service-worker.js is missing');
  for (const icon of iconFiles) {
    const file = path.join(PUBLIC, icon);
    if (!exists(file)) fail(`PWA icon is missing: public/${icon}`);
    if (fs.statSync(file).size < 100) fail(`PWA icon is empty or invalid: public/${icon}`);
  }

  if (!/<link\b[^>]*rel=["']manifest["'][^>]*href=["']\.\/manifest\.webmanifest["']/i.test(html)
    && !/<link\b[^>]*href=["']\.\/manifest\.webmanifest["'][^>]*rel=["']manifest["']/i.test(html)) {
    fail('index.html must link ./manifest.webmanifest');
  }

  const manifest = assertJson(manifestFile);
  const expected = {
    name: 'Project Tracker',
    short_name: 'Tracker',
    start_url: './?source=pwa',
    scope: './',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#2563eb',
    orientation: 'portrait'
  };
  for (const [key, value] of Object.entries(expected)) {
    if (manifest[key] !== value) fail(`manifest.webmanifest has invalid ${key}: expected ${value}, got ${manifest[key]}`);
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 3) fail('manifest.webmanifest must declare 3 PWA icons');
  for (const icon of iconFiles) {
    const src = `./${icon}`;
    if (!manifest.icons.some((item) => item.src === src)) fail(`manifest.webmanifest is missing icon ${src}`);
  }
  if (!manifest.icons.some((item) => item.src === './assets/icons/maskable-512.png' && String(item.purpose || '').includes('maskable'))) {
    fail('manifest.webmanifest must mark maskable-512.png as maskable');
  }

  checkJsSyntax(serviceWorkerFile);
  const sw = fs.readFileSync(serviceWorkerFile, 'utf8');
  if (!sw.includes('pt-pwa-v1')) fail('service-worker.js must define a versioned pt-pwa cache');
  if (!sw.includes('/assets/build/')) fail('service-worker.js must only cache Vite build assets by /assets/build/');
  if (!sw.includes('mode === \'navigate\'') && !sw.includes('mode === "navigate"')) fail('service-worker.js must handle navigation requests explicitly');
  if (!sw.includes('supabase') || !sw.includes('/auth/v1/') || !sw.includes('/realtime/v1/') || !sw.includes('/storage/v1/')) {
    fail('service-worker.js must bypass Supabase auth/realtime/storage requests');
  }

  const pwaRegister = path.join(SRC, 'features', 'pwa', 'register.js');
  if (!exists(pwaRegister)) fail('src/features/pwa/register.js is missing');
  const registerJs = fs.readFileSync(pwaRegister, 'utf8');
  if (!registerJs.includes("register('./service-worker.js', { scope: './' })")) fail('PWA registration must use ./service-worker.js with ./ scope');
  if (!registerJs.includes('addEventListener(\'load\'') && !registerJs.includes('addEventListener("load"')) fail('PWA registration must wait for window load');
}

if (!exists(INDEX)) fail('index.html is missing');
if (!exists(SRC)) fail('src/ is missing');
if (!exists(PUBLIC)) fail('public/ is missing');
if (!exists(path.join(ROOT, 'vite.config.js'))) fail('vite.config.js is missing');

const html = fs.readFileSync(INDEX, 'utf8');
const refs = parseHtmlRefs(html).filter(ref => !isExternal(ref));
for (const ref of refs) {
  const target = resolveViteRef(ref);
  if (target && !exists(target)) fail(`Missing HTML reference ${ref} -> ${path.relative(ROOT, target)}`);
}
if (!html.includes('/src/app/bootstrap.js')) fail('index.html must load /src/app/bootstrap.js as the Vite entrypoint');
checkPwa(html);

const jsFiles = walk(SRC, f => f.endsWith('.js'));
const cssFiles = walk(SRC, f => f.endsWith('.css'));
for (const file of jsFiles) {
  checkJsSyntax(file);
  checkImports(file);
}
for (const file of cssFiles) {
  const css = fs.readFileSync(file, 'utf8');
  const importMatches = [...css.matchAll(/@import\s+["']([^"']+)["']/g)];
  for (const [, spec] of importMatches) {
    const target = path.resolve(path.dirname(file), spec);
    if (!exists(target)) fail(`Missing CSS import ${spec} in ${path.relative(ROOT, file)}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (!pkg.scripts?.build?.includes('vite build')) fail('package.json build script must run vite build');
if (!pkg.devDependencies?.vite) fail('package.json must include vite as devDependency');

console.log(`Project check passed: Vite entrypoint valid, ${jsFiles.length} JS files, ${cssFiles.length} CSS files, PWA assets valid.`);
