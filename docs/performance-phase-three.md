# Performance phase three — background work

## Changes

- Runtime publishes identity/view context only when it actually changes. Optional
  modules no longer need whole-page mutation scans or one-second identity timers.
- Materials are loaded on first opening, with a 60-second memory cache and shared
  in-flight reads. Templates, folders and files start concurrently. Failed reads
  preserve previous data; session changes discard old results and clear caches.
- Owner announcement history is read only when Settings is visible. The current
  announcement still checks at startup, so first-launch announcements are retained.
  Only the Settings class is observed instead of the whole document body.
- Notification realtime remains active. Its backup reconciliation uses 15 seconds
  when subscribed and 5 seconds after connection/query failure. Connection failure,
  focus, visibility return and network return request an immediate check.
- Hidden/offline tabs stop backup polling; realtime and server push are not removed.
- A single reconciliation owns remote unread state, and its four independent reads
  start concurrently. Abort signals bound notification/material reads to 15 seconds.
- An unchanged notification list is not replaced. Repeated polls and late realtime
  duplicates preserve read status; older assignment records cannot displace newer
  assignments. Mentions keep the server creation timestamp.
- Notification identity changes remove the old subscription and reject late reads.

## Verification

All 21 Node regression suites pass, including completion queues for all four tested
roles, four-state subtasks, attachments, comments, mobile controls and inspector.
The new background suite covers polling cadence, immediate recovery, hidden/offline
pause, assignment/mention recovery, unchanged rendering, monotonic read state,
identity races, lazy history/materials, in-flight deduplication and failed reads.

Supabase read-only checks confirmed that tasks, task_assignees and task_comments
are published to Realtime. No schema, RLS, permissions or production task/comment
data was changed. Existing data limits remain unchanged (including the 80 recent
comments per notification reconciliation).

Browser baseline: four notification reads every approximately five seconds, plus
a separate read-state timer. DevTools also reports a proxy event for many requests;
measurements count only script-initiated requests, not those proxy duplicates.

Published browser verification is recorded after deployment below.
