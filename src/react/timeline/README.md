# React TimelinePage

React Stage 9 moves the timeline presentation layer into a React island.

The legacy runtime still owns task mutations, opening `TaskModal`, date updates and timeline drag/resize handlers. `src/features/timeline/calendar-renderer.js` now acts as the adapter: it reads the current legacy state, builds a typed timeline view model and mounts `TimelinePage` into the existing `#timeline` section.

The React layer must keep the existing DOM contracts used by legacy handlers:

- `tlQ`, `tlP`, `tlU`, `tlS`, `tlR`, `tlDone`
- `data-action="tl-prev"`, `tl-next`, `tl-today`, `tl-open`, `tl-add-day`, `tl-empty`
- `.timeline-time-grid[data-date]`
- `.timeline-event`

Do not call Supabase directly from React timeline components.
