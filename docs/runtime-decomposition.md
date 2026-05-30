# Runtime decomposition — Stage 26F

`src/app/runtime-core.js` and `src/app/runtime-compatibility.js` have both been removed.

The application no longer uses the legacy runtime bridge as a central execution path. Runtime responsibilities now live in explicit typed layers:

- `src/app/main.tsx` mounts the React root.
- `src/app/App.tsx` renders the React shell and routed pages.
- `src/app/workspaceRuntime.ts` owns Supabase client creation, session restore, profile binding and initial workspace bootstrap.
- `src/react/data/queries/workspaceBootstrapQuery.ts` owns query-backed workspace data loading.
- `src/shared/realtime/*` owns realtime event normalization and TanStack Query invalidation.
- `src/react/actions/workspaceActions.ts` calls typed controllers/repositories directly.
- `src/shared/store/uiStore.ts` owns UI state such as active view, modals and filters.

The runtime inventory is now intentionally empty. If a future change needs app-level behavior, it must be added to one of the explicit layers above, not by reintroducing a runtime bridge.
