import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UNIT_DIR = path.join(ROOT, 'tests', 'unit');
const SMOKE_DIR = path.join(ROOT, 'tests', 'smoke');

function fail(message) {
  console.error(`Test coverage check failed: ${message}`);
  process.exit(1);
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function list(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(predicate).sort();
}

const unitTests = list(UNIT_DIR, (name) => name.endsWith('.test.mjs'));
const smokeTests = list(SMOKE_DIR, (name) => name.endsWith('.spec.js'));

const requiredUnitTests = [
  'controller-behavior.test.mjs',
  'storage-and-assignment-services.test.mjs',
  'pure-react-runtime-contract.test.mjs',
  'router-page-rendering-contract.test.mjs',
  'query-realtime-integration.test.mjs',
  'supabase-security-audit.test.mjs'
];
for (const testFile of requiredUnitTests) {
  if (!exists(`tests/unit/${testFile}`)) fail(`required Stage 27 unit test is missing: ${testFile}`);
}

const requiredSmokeFiles = [
  'tests/smoke/app-shell.spec.js',
  'tests/smoke/react-navigation.spec.js',
  'tests/smoke/supabase-stub.js'
];
for (const file of requiredSmokeFiles) {
  if (!exists(file)) fail(`required Stage 27 smoke file is missing: ${file}`);
}

if (unitTests.length < 35) fail(`expected at least 34 unit test files after Stage 27, found ${unitTests.length}`);
if (smokeTests.length < 2) fail(`expected at least 2 smoke spec files after Stage 27, found ${smokeTests.length}`);

const unitRunner = read('tools/run-unit-tests.mjs');
if (!unitRunner.includes("tests', 'unit")) fail('unit runner must discover tests/unit automatically');
if (!unitRunner.includes("endsWith('.test.mjs')")) fail('unit runner must run every *.test.mjs file');

const pkg = JSON.parse(read('package.json'));
if (!pkg.scripts?.['test:unit']?.includes('run-unit-tests')) fail('package.json must expose test:unit through run-unit-tests');
if (!pkg.scripts?.['test:smoke']?.includes('playwright test')) fail('package.json must expose Playwright smoke tests');
if (!pkg.scripts?.['check:tests']?.includes('check-test-coverage')) fail('package.json must expose check:tests');
if (!pkg.scripts?.check?.includes('npm run check:tests')) fail('npm run check must include check:tests');

const smokeHelper = read('tests/smoke/supabase-stub.js');
if (!smokeHelper.includes('installSupabaseStub')) fail('smoke tests must share the Supabase stub helper');
if (!smokeHelper.includes('owner@example.com')) fail('smoke stub must provide an authenticated owner profile');

console.log(`Test coverage check passed: ${unitTests.length} unit test files, ${smokeTests.length} smoke specs.`);
