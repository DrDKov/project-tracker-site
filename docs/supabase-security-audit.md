# Stage 28 — Supabase security audit

This audit documents the intended security boundary for the Project Tracker Supabase backend. It is a static repository audit plus an idempotent hardening migration; it does not require service-role secrets and does not contact production Supabase.

## Security posture

The frontend is now a pure React/Vite runtime, but the security boundary remains Supabase RLS and Storage policies. UI permission checks are only a consistency layer. The database must reject unauthorized direct requests even if a user bypasses the UI.

## Canonical access rules

The authoritative access matrix is stored in:

```text
docs/supabase-security-matrix.json
```

Core rules:

```text
workspace owner/admin → can manage users, audit and workspace-level administration
project owner/editor/admin → can write project tasks and collaboration data
project members → can read visible project data
workspace owner → only role allowed to use Materials templates/folders/files/storage
current user → can update own safe profile fields and own read receipts/presence
```

## Stage 28 migration

The hardening migration is:

```text
supabase/migrations/005_security_hardening_audit.sql
```

It is also folded into the end of:

```text
supabase/setup.sql
```

The migration is intentionally defensive and idempotent:

1. drops historical permissive `anon` policies from early MVP stages;
2. enables RLS on every workspace table;
3. revokes table privileges from `anon` for protected workspace tables;
4. grants table privileges to `authenticated`, where RLS still decides row access;
5. forces `project-chat-files` and `workspace-materials` buckets to `public = false`;
6. defines `workspace_security_baseline_report()` for runtime DBA inspection.

## Storage audit

Required buckets:

```text
project-chat-files   private, project-visible authenticated access
workspace-materials  private, workspace-owner-only access
```

The application uses signed URLs for files. Buckets must not be public.

## Known limitations of static audit

This repository check cannot prove the live Supabase project already has the migration applied. After deploying this archive, run the Stage 28 migration in Supabase SQL Editor for an existing database, or run the full `supabase/setup.sql` for a new database.

After applying the migration, an authenticated owner/admin can inspect the baseline with:

```sql
select public.workspace_security_baseline_report();
```

The expected result should have empty `anon_public_table_policies` and `public_workspace_buckets` arrays.

## Required local checks

```bash
npm run check
npm run build
```

`npm run check` includes `npm run check:security`, which validates this audit package, the hardening migration and the setup SQL folding.
