# Performance phase two — selective data loading

## Changes

- Core task data and independent reference queries start concurrently.
- Startup reads only `id,task_id,created_at,updated_at` for comment counters;
  comment bodies are fetched only when the corresponding task is opened.
- Chat history is fetched for the selected project, not the whole workspace.
- The owner's latest 500 audit entries are fetched only on opening the audit view.
- History queries use a primary-key cursor in 500-row batches. Unlike the old
  unpaged requests, they do not silently stop at the REST 1000-row limit.
- Fresh histories are cached in memory for 60 seconds and requests in flight are
  shared. Explicit refresh and reconnect refresh only the currently open history.
- Snapshots merge with newer local/realtime changes. Duplicate events do not
  duplicate comments/messages; late reads cannot undo writes made during a read.
- Caches are cleared on logout or identity/role changes. Responses belonging to
  an old identity are discarded.
- Failed history reads retain the last successfully loaded data and offer Retry.
  Failed core reference reads also retain existing data.
- Project-message realtime changes now update loaded chats. Reading old chat
  messages no longer jumps to the bottom on every unrelated render.
- Query timeout timers are cleared when a request finishes.

## Unchanged behavior and limits

No database schema, RLS policies, credentials, storage configuration, task
completion queues, or notification permissions were changed. Notification
polling still reads recent mention bodies, independently of task history; this
is necessary for mention notifications. Task queries retain the existing 3000-row
cap and the audit retains the existing 500-entry limit.

Chat search still searches the complete fetched project history, including
message text, attachment links, and author names. Task comment editing and
subtask references use full task-scoped rows after the history has loaded.

## Verification

`tests/workspace-lazy-data.test.cjs` verifies concurrent startup, lightweight
counts, >1000-row histories, project isolation, in-flight deduplication, writes
and deletes during reads, session changes, preserved data on failure, Retry, and
owner-only audit reads. Existing completion tests verify all four tested roles.
All 20 Node regression suites pass before and after deployment preparation.

Supabase read-only checks confirmed the selected columns exist and both
`task_comments` and `project_messages` are already published to Realtime.
No production tasks, comments, or messages were created/changed for testing.

Browser verification results are recorded below after deployment. Timings are
observations from a single session, not a guaranteed speedup for every network.
