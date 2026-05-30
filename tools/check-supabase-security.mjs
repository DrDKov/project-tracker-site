import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function fail(message) {
  console.error(`Supabase security check failed: ${message}`);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

const requiredFiles = [
  'docs/supabase-security-audit.md',
  'docs/supabase-security-matrix.json',
  'supabase/migrations/005_security_hardening_audit.sql'
];
for (const file of requiredFiles) {
  if (!exists(file)) fail(`required Stage 28 file is missing: ${file}`);
}

const matrix = JSON.parse(read('docs/supabase-security-matrix.json'));
if (matrix.stage !== 28) fail('security matrix must declare stage 28');
for (const table of ['projects', 'tasks', 'project_members', 'task_comments', 'workspace_templates', 'material_files']) {
  if (!matrix.tables?.[table]) fail(`security matrix is missing table: ${table}`);
}
for (const bucket of ['project-chat-files', 'workspace-materials']) {
  if (matrix.storage?.[bucket]?.public !== false) fail(`security matrix must mark ${bucket} as private`);
}

const migration = read('supabase/migrations/005_security_hardening_audit.sql');
const setup = read('supabase/setup.sql');
const audit = read('docs/supabase-security-audit.md');

for (const token of [
  'revoke all on table',
  'from anon',
  'grant select, insert, update, delete on table',
  'to authenticated',
  "where id in ('project-chat-files', 'workspace-materials')",
  'workspace_security_baseline_report',
  'anon_public_table_policies',
  'public_workspace_buckets',
  'rls_disabled_tables'
]) {
  if (!migration.includes(token)) fail(`security migration missing required token: ${token}`);
}

const legacyAnonPolicies = [
  'project_tracker_projects_select',
  'project_tracker_projects_insert',
  'project_tracker_projects_update',
  'project_tracker_projects_delete',
  'project_tracker_tasks_select',
  'project_tracker_tasks_insert',
  'project_tracker_tasks_update',
  'project_tracker_tasks_delete',
  'project_tracker_log_select',
  'project_tracker_log_insert',
  'project_tracker_settings_select',
  'project_tracker_settings_upsert',
  'project_tracker_users_select',
  'project_tracker_users_insert',
  'project_tracker_users_update',
  'project_tracker_users_delete'
];
for (const policy of legacyAnonPolicies) {
  if (!migration.includes(`drop policy if exists "${policy}"`)) {
    fail(`security migration must drop legacy anon policy: ${policy}`);
  }
}

if (!setup.includes('Stage 28 folded security hardening migration')) fail('setup.sql must fold Stage 28 migration for new databases');
if (!setup.includes('workspace_security_baseline_report')) fail('setup.sql must include baseline report function');

const setupStage28Index = setup.indexOf('Stage 28 folded security hardening migration');
const firstLegacyAnonPolicyIndex = Math.min(
  ...legacyAnonPolicies.map((policy) => setup.indexOf(policy)).filter((index) => index >= 0)
);
if (setupStage28Index <= firstLegacyAnonPolicyIndex) {
  fail('Stage 28 hardening block must be folded after the historical legacy anon policy section in setup.sql');
}

if (!audit.includes('Supabase RLS') || !audit.includes('workspace_security_baseline_report')) {
  fail('security audit document must explain RLS and live baseline report');
}

const pkg = JSON.parse(read('package.json'));
if (!pkg.scripts?.['check:security']?.includes('check-supabase-security')) fail('package.json must expose check:security');
if (!pkg.scripts?.check?.includes('npm run check:security')) fail('npm run check must include check:security');

console.log('Supabase security check passed: Stage 28 audit, hardening migration and setup folding verified.');
