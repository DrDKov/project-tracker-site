import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, 'docs/runtime-decomposition.json');

function fail(message) { console.error(`Runtime inventory check failed: ${message}`); process.exit(1); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return fs.readFileSync(file, 'utf8'); }

for (const file of ['src/app/runtime-core.js', 'src/app/runtime-compatibility.js', 'src/app/runtime.js', 'src/app/data-loader.js', 'src/app/session-controller.js', 'src/app/legacy/legacyDomTemplate.ts', 'src/app/bootstrap.js']) {
  if (exists(file)) fail(`legacy runtime file must be absent after Stage 26F: ${file}`);
}
const inventory = JSON.parse(read(INVENTORY));
if (inventory.stage !== '26F') fail('inventory stage must be 26F');
if (inventory.runtimeFile !== null) fail('inventory runtimeFile must be null after Stage 26F');
if (!Array.isArray(inventory.functions) || inventory.functions.length !== 0) fail('inventory.functions must be empty after Stage 26F');
const removed = inventory.removedInStage26F || [];
for (const expected of ['src/app/runtime-compatibility.js', 'src/app/runtime.js', 'src/app/data-loader.js', 'src/app/session-controller.js', 'src/app/legacy/legacyDomTemplate.ts']) {
  if (!removed.some((item) => item.name === expected)) fail(`Stage 26F removal missing from inventory: ${expected}`);
}
console.log(`Runtime inventory check passed: Stage 26F removed runtime compatibility bridge and ${removed.length} legacy runtime files are documented.`);
