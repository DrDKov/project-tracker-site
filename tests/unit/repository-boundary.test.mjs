import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const repoDir = path.join(ROOT, 'src', 'repositories');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(repoDir).filter((file) => /\.(ts|tsx)$/.test(file));
assert.ok(files.length >= 4, 'repository layer must contain typed repository modules');

for (const file of files) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const content = fs.readFileSync(file, 'utf8');
  assert.equal(/\.from\s*\(/.test(content), false, `${rel} must not call Supabase .from directly`);
  assert.equal(/\.rpc\s*\(/.test(content), false, `${rel} must not call Supabase .rpc directly`);
  assert.equal(/\.storage\s*\./.test(content), false, `${rel} must not call Supabase storage directly`);
}

console.log('repository boundary tests passed');
