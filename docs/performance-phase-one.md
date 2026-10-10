# Workspace performance — phase 1

This phase changes client-side computation and rendering only. Database schema,
RLS, completion RPCs, write queues, realtime subscriptions and notification
fallback polling remain unchanged.

## Changes

- Render-scoped lookup maps and task-grouped related rows. Indexes are discarded
  in `finally`, including on errors, so async responses and same-length array
  replacements cannot leave stale caches.
- Assignment reads no longer deduplicate and rewrite the entire assignment
  array for every card.
- Keyed board reconciliation retains unchanged column/card DOM nodes. Changed
  cards preserve subtask composer text and restore focus/selection when needed.
  Mobile column classes and compact composer state are preserved.
- Search input uses a 140 ms trailing debounce; filter controls remain immediate.
- Snapshot completion merges use a single ID map instead of repeated searches.
- Legacy timeline lane calculation is scoped to its visible view, batched through
  requestAnimationFrame, and triggered by content/size/font/image changes.
  The body-wide observer and 700 ms idle polling are removed.
- Comment mention decoration observes the comments block instead of scanning
  the whole document every 700 ms. Notification polling itself is retained.
- Notification scripts already loaded by index.html are not imported a second
  time under another cache-version URL.

## Verification

Run all `tests/*.test.cjs` with Node. The new performance suite checks scoped
cache cleanup, fresh rows, same-length replacements, keyed updates/removals/
insertion/reordering, and absence of the removed idle timers.

For the isolated computation benchmark:

    PERF_BASELINE=HEAD node tests/workspace-performance.test.cjs

Run this before committing, against the pre-change HEAD. A Windows desktop run
with 357 synthetic tasks measured approximately 42 ms before and 2 ms after for
related-data preparation. This is not a page-load or end-to-end speed claim.

Open `tests/fixtures/performance-board.html` through a static HTTP server to
check real DOM preservation. Expected: an identical refresh retains all 357
cards; changing one retains 356; typed subtask drafts survive; filtering and
restoring never produce duplicate task IDs.

## Subsequent phases

Not included here: lazy-loading chat/comment/audit history, query/index tuning,
virtualized boards, and production startup/interaction percentile measurements.
These require separate tests for complete search, permissions, drag-and-drop,
accessibility and multi-user synchronization.
