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

console.log(`Project check passed: Vite entrypoint valid, ${jsFiles.length} JS files, ${cssFiles.length} CSS files, public assets valid.`);
