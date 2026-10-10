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

## Published browser verification

GitHub Pages deployment of `7abdd3e` succeeded. The built-in browser confirmed:

- Startup has no `workspace_templates`, `material_folders`, `material_files` or
  announcement-history request. The current announcement and receipt still load.
- Settings loads the owner's two saved announcements without errors.
- Materials loads one template, four folders and document lists correctly. Its
  three initial requests start within 0.4 ms of one another. Reopening within the
  cache period performs zero new material reads.
- In an idle foreground tab, backup polls are 15.34 seconds apart, with exactly
  one read-state request per batch (previously about 5 seconds plus another timer).
- The task board has 351 unique tasks, 624 displayed subtasks and comment-counter
  sum 306, identical to the pre-change browser. No data was edited for verification.
- Only one notification panel is present, with the explicit mark-read button.
  Its first item's browser node remains the same across idle polling: unchanged
  notifications are no longer replaced in the DOM.
- Browser console contains no warnings/errors in the tested flows.

This verifies reduced request/DOM work, not a universal application speed factor.
