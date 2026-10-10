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

## Published browser verification

- The initial queries for users, memberships, assignments, acknowledgements,
  subtasks, projects, tasks and the comment index start within 5 ms of each other.
- Startup does not request all project messages, audit entries or full comment
  bodies. Recent mention polling remains operational and independent.
- The board retains exactly 351 unique tasks, 624 subtasks and a comment-count
  sum of 306, matching the previous published version.
- Opening tasks with 10 and 2 comments fetches their respective task-scoped
  histories. While the second history loads, no comments from the first are shown.
- A new task has zero comments and the save-first placeholder.
- A project with 8 server messages renders all 8 messages and 8 attachment links.
  Searching for nonexistent text returns zero; clearing the search restores all 8.
- Audit loading starts only after opening the owner's audit view.
- No browser console errors or warnings were observed in these flows.

These are functional and request-level observations, not a guaranteed speedup
factor for every device or network.
