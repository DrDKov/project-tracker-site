import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/005_security_hardening_audit.sql', 'utf8');
const setup = fs.readFileSync('supabase/setup.sql', 'utf8');
const matrix = JSON.parse(fs.readFileSync('docs/supabase-security-matrix.json', 'utf8'));
const architecture = fs.readFileSync('tools/check-architecture.mjs', 'utf8');

assert.equal(matrix.stage, 28);
assert.equal(matrix.storage['project-chat-files'].public, false);
assert.equal(matrix.storage['workspace-materials'].public, false);
assert.ok(matrix.tables.projects.helper.includes('can_view_project'));
assert.ok(matrix.tables.workspace_templates.helper.includes('is_workspace_owner'));

assert.match(migration, /revoke all on table[\s\S]*from anon;/);
assert.match(migration, /grant select, insert, update, delete on table[\s\S]*to authenticated;/);
assert.match(migration, /update storage\.buckets[\s\S]*project-chat-files[\s\S]*workspace-materials/);
assert.match(migration, /workspace_security_baseline_report/);
assert.match(migration, /anon_public_table_policies/);
assert.match(migration, /public_workspace_buckets/);
assert.match(migration, /rls_disabled_tables/);

assert.ok(setup.includes('Stage 28 folded security hardening migration'));
assert.ok(setup.indexOf('Stage 28 folded security hardening migration') > setup.indexOf('project_tracker_tasks_update'));
assert.ok(architecture.includes('Stage 28'));

console.log('supabase security audit tests passed');
