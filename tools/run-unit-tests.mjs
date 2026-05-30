import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TEST_DIR = path.join(ROOT, 'tests', 'unit');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(TEST_DIR)) fail('Unit test directory is missing: tests/unit');

const files = fs.readdirSync(TEST_DIR)
  .filter((name) => name.endsWith('.test.mjs'))
  .sort();

if (!files.length) fail('No unit tests found under tests/unit');

for (const name of files) {
  const file = path.join(TEST_DIR, name);
  const runner = process.platform === 'win32' ? path.join(ROOT, 'node_modules', '.bin', 'tsx.cmd') : path.join(ROOT, 'node_modules', '.bin', 'tsx');
  const res = spawnSync(runner, [file], { cwd: ROOT, encoding: 'utf8' });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status !== 0) fail(`Unit test failed: ${name}`);
}

console.log(`Unit test suite passed: ${files.length} files.`);
