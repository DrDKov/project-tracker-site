# Reliable completion

Completion is a narrow capability: active Auth-linked project editors and assigned
users with project visibility can mark tasks done/reopened and cycle subtasks through
`not_done → partial → done → attention → not_done`. Assigned viewers do not acquire
general editing rights. Unassigned viewers, deleted tasks and anonymous callers are
rejected. Audit triggers remain enabled; the database records the completion author.

Public RPCs `set_task_completion` and `set_subtask_completion` are security-invoker
wrappers. The private implementation validates the actual `auth.uid()`, active profile,
project visibility and assignment before modifying only completion fields. Its search
path is empty, execution is denied to PUBLIC/anon, and all relations are schema-qualified.
The task row is locked before checking assignment and writing a task/subtask state.

The UI serializes writes per record, applies the latest click immediately, validates
the returned row and rolls back to the latest confirmed state on failure. Realtime
and full reloads merge newer server timestamps and preserve pending click intent.
Background board replacement is deferred while completion writes are in flight.

Regression coverage: `tests/task-completion-races.test.cjs` and
`supabase/tests/task_completion.sql`. The SQL test uses every active Auth-linked
account and its current visible projects, and rolls back all fixtures/audit/push rows.
Browser tests use `tests/compact-preview.cjs`, an isolated in-memory fixture with no
production connection, including cross-tab state propagation and reload persistence.

Verified on 2026-10-09: 4 Auth-linked accounts, 22 user/project contexts. The active
profile «Дмитрий М.» has no Auth link and cannot be tested as an authenticated user.
Physical user devices/sessions are not impersonated by these checks.
