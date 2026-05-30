# React islands

React is introduced incrementally. Do not rewrite the whole application shell at once.

Rules:

1. React components are presentation boundaries.
2. React components receive plain props and callbacks from feature modules.
3. React components must not call Supabase directly.
4. Shared data still comes from `src/core/state`, `src/core/workspace-context.js` and `src/services`.
5. Each new island should have a small mount module and should be safe to remove.

Current island:

```text
notifications/NotificationCenter.tsx
notifications/mountNotificationCenter.tsx
notifications/notificationModel.ts
```

Stage 2 boundary:

- `NotificationCenter.tsx` renders only React UI.
- `notificationModel.ts` owns pure notification data rules: ids, labels, store normalization, project label hydration and duplicate handling.
- `src/features/notifications/index.js` remains the integration controller for realtime and mention workflows until the next migration stage.


Stage 3 boundary:

```text
tasks/taskCardModel.ts
tasks/TaskCard.tsx
tasks/mountTaskCards.tsx
```

TaskCard is now a React island mounted into the existing legacy card shell. The legacy board still owns filtering, column rendering, drag/drop, ordering and modal opening. React owns the task card presentation and receives a pure view model from `taskCardModel.ts`.

## React Stage 7 — MaterialsPage

The owner-only Materials section is now rendered by a React island. Supabase Storage, templates, folders, signed URLs and owner permissions remain in the existing service/permission layers. The legacy feature module is now an integration adapter that creates the navigation entry, detects owner access, loads data through `materials.service.js` and mounts `src/react/materials/MaterialsPage.tsx`.

## React Stage 8 — TeamPage / Users / Permissions UI

The team page is now rendered by a React island. `src/features/team/render.js` remains the integration adapter called by legacy runtime, while `src/react/team/teamModel.ts` creates a typed view model for users, roles, project memberships and available actions. User editing still uses the existing legacy modal and action layer through `data-action="open-user"`.



## React Stage 9 — TimelinePage

The timeline calendar presentation is now rendered by a React island:

```text
react/timeline/timelineModel.ts
react/timeline/TimelinePage.tsx
react/timeline/mountTimelinePage.tsx
```

`src/features/timeline/calendar-renderer.js` remains the integration adapter. It preserves the existing timeline DOM contracts used by legacy handlers: `tlQ`, `tlP`, `tlU`, `tlS`, `tlR`, `tlDone`, `data-action=tl-*`, `.timeline-time-grid[data-date]` and `.timeline-event`.

The legacy runtime still owns mutations, task opening, date updates, drag/resize wiring and Supabase actions. React owns the rendered week calendar, toolbar, day columns, all-day row and timed events.

## React Stage 10 — ChatPage

The project chat presentation is now rendered by a React island:

```text
react/chat/chatModel.ts
react/chat/ChatPage.tsx
react/chat/mountChatPage.tsx
```

`src/features/chat/index.js` remains the integration adapter. It preserves Supabase Storage uploads, project message creation/deletion, chat clearing and runtime state updates. The React component preserves legacy DOM ids used by the action layer: `chatProject`, `chatSearch`, `chatMessages`, `chatText`, `chatFiles`, `sendChatBtn` and `chatFileSummary`.

## React Stage 11 — AppShell

The sidebar and topbar are now React-owned shell chrome:

```text
app-shell/appShellModel.ts
app-shell/AppShell.tsx
app-shell/mountAppShell.tsx
```

This is still not a full React root application. The shell renders navigation/status/global actions, while page contents remain in their own islands and legacy adapters. Keep this boundary until Stage 12 introduces the unified React state/data layer.


## React Stage 12 — State/Data Layer

The React layer now has a canonical state/data adapter over the existing `appStore`:

```text
state/workspaceStoreAdapter.ts
state/useWorkspaceStore.tsx
state/WorkspaceStoreProvider.tsx
state/workspaceSelectors.ts
data/workspaceDataLayer.ts
```

Rules after Stage 12:

1. New React components must not read `window.__WorkspaceApp` directly.
2. Use `useWorkspaceState()` or `useWorkspaceSelector()` for state reads.
3. Use `useWorkspaceActions()` for compatibility actions while the legacy runtime still owns mutations.
4. Do not create a second cache. The current `appStore` remains the single source of truth until the repository/service layer is fully migrated.
5. If a component needs a derived entity model, put pure projection logic under `src/react/data` or a domain model file and cover it with a unit test.


## Stage 13 TypeScript boundary

New React-facing state modules should be written in TypeScript. The current typed state entrypoints are:

```text
state/useWorkspaceStore.tsx
state/WorkspaceStoreProvider.tsx
state/workspaceSelectors.ts
```

Domain-facing TypeScript facades now live under:

```text
../repositories/
```

Use them for new typed React work instead of adding new raw Supabase calls or new untyped service wrappers.

## Stage 14 cleanup boundary

Stage 14 removed the retired notification polling fallback and added architecture checks for the React migration.

React modules must continue to follow these boundaries:

```text
- no direct imports from src/features/**
- no direct Supabase calls from React components
- no direct window.__WorkspaceApp reads except inside src/react/state/workspaceStoreAdapter.ts or mount adapters
- browser DOM access only in mount adapters or shared island infrastructure
```

If a future React module needs data, use the React state/data adapter or typed repository layer. If it needs to trigger legacy behavior during migration, expose the action through `workspaceStoreAdapter` rather than reaching into runtime globals directly.

## Stage 16 controller boundary

React modules should treat `src/controllers/*` as the mutation boundary. New React components should call typed controllers/hooks instead of importing legacy `src/features/actions/runtime-actions.js` or service modules. The current runtime action adapter is transitional and exists only for legacy DOM form compatibility.


## Stage 17 — React modal ownership

Stage 17 moves the project, user and access modals to React-controlled forms while keeping the current runtime bridge only as a temporary compatibility/action surface. The new canonical modal path is:

```text
React modal state -> typed controller wrapper -> controller -> repository -> service -> Supabase
```

Added modules:

```text
src/react/modals/modalModels.ts
src/react/modals/ProjectModal.tsx
src/react/modals/UserModal.tsx
src/react/modals/AccessModal.tsx
src/react/modals/mountWorkspaceModals.tsx
src/styles/modal-ownership-react.css
```

The old DOM ids remain temporarily for compatibility, but project/user/access modal save actions no longer depend on `document.getElementById()` reads. Since Stage 26B they call `createWorkspaceReactActions()` directly, which constructs typed controllers over the hardened repository set.

## Stage 18 event ownership

React components should not use `data-action` for primary behavior when a typed action callback is available. Stage 18 introduces:

```text
src/react/actions/workspaceActions.ts
```

Converted components:

```text
TaskCard
TaskBoard
ProjectCard
UserCard
ChatPage message delete
```

This adapter is temporary. It is allowed to read `window.__WorkspaceApp` because it is the migration boundary between React callbacks and the current typed controller/runtime action surface. New React components should receive explicit action props from their mount adapters instead of adding new global `data-action` handlers.

## Stage 19 — TanStack Query / Zustand data layer

Stage 19 adds the final React-facing data/UI layer without deleting the existing runtime loader yet. Server-state now has a TanStack Query boundary, and local UI-state has a Zustand boundary. The current legacy loader remains the active writer during migration, while `WorkspaceDataBridge` mirrors loaded runtime data into the Query cache.

Added files:

```text
src/shared/query/queryClient.ts
src/shared/query/QueryProvider.tsx
src/shared/query/queryInvalidation.ts
src/shared/store/uiStore.ts
src/react/app/ReactAppProviders.tsx
src/react/data/queries/workspaceQueryKeys.ts
src/react/data/queries/workspaceQueryClient.ts
src/react/data/queries/workspaceQueries.ts
src/react/data/queries/useWorkspaceServerState.ts
src/react/data/mutations/workspaceMutations.ts
src/react/data/bridge/WorkspaceDataBridge.tsx
src/react/data/index.ts
```

The intended direction is now:

```text
React UI → hooks/controllers → TanStack Query/Zustand → repositories → services → Supabase
```

React islands are wrapped by `ReactAppProviders` from `src/react/core/createReactIsland.tsx`, so every island receives the same QueryClient, WorkspaceStoreProvider and data bridge.

This stage does not remove `data-loader.js` or `runtime-compatibility.js`. They stay as the compatibility writer until Stage 20 moves realtime invalidation and later stages move loading to query hooks completely.


## Stage 20 realtime boundary

React islands are now wrapped by `WorkspaceRealtimeProvider` through `ReactAppProviders`. New React modules should rely on TanStack Query cache invalidation rather than manual DOM/render refreshes.

The canonical realtime path is:

```text
workspace:realtime-change event -> WorkspaceRealtimeProvider -> invalidateRealtimeChange() -> query keys
```

Do not add new React-side polling or manual DOM refresh code for realtime data. Add table-to-query mapping in `src/shared/realtime/realtimeInvalidation.ts` instead.

## Stage 21 repository usage

React code should not import services directly. For server data, use the data/query hooks or typed controllers. When a repository is needed inside a bridge, use `createWorkspaceRepositorySet(client)` as the single construction point.

Preferred path:

```text
React component → hook/controller → createWorkspaceRepositorySet(client) → repository method
```


## Stage 22 TypeScript rule

`src/react` is now TypeScript-only. Use `.ts` for model/state/action modules and `.tsx` for React components or mount boundaries.

Do not add new `.js` or `.jsx` files under `src/react`. Legacy JavaScript may remain in `src/features`, `src/app`, `src/core` and `src/services` until those compatibility layers are removed in later cleanup stages.

## Stage 23 Router boundary

React islands are now mounted under `WorkspaceRouterProvider`. New navigation should use:

```ts
import { useWorkspaceRoute } from '../app/router/useWorkspaceRoute';
```

Current hash routes are synchronized with the legacy `setView()` bridge. React pages exist under `src/pages/` as typed page artifacts and should be expanded into full page components as legacy adapters are removed.

## Stage 24 UI rule

New React components should prefer `src/shared/ui` primitives:

```ts
import { Button, Badge, Card, EmptyState } from '../shared/ui';
```

Feature components may keep domain-specific CSS, but basic buttons, badges, cards, fields, tabs, dropdowns and empty states should come from the shared design-system layer.

## Stage 25 — Legacy render adapter reduction

Stage 25 removes the remaining manual HTML rendering from the highest-risk legacy render adapters where React already owns presentation. The task card adapter is now a pure model facade; project cards no longer use fallback HTML; dashboard overview cards are mounted through React; audit rendering is mounted through React AuditLog; and access list refresh is delegated to the React-controlled AccessModal.

The runtime still keeps a compatibility render bridge until React Router/query ownership replaces it completely, but removed wrappers `cardP` and `cardT` are now documented in `docs/runtime-decomposition.json` under `removedInStage25`.

## Stage 26 — runtime-core deletion

Stage 26 deletes `src/app/runtime-core.js`. The remaining temporary bridge is now named explicitly as `src/app/runtime-compatibility.js`, so the architecture no longer presents the old runtime as the application core. The file is still a compatibility bridge for the last DOM/data-action/realtime contracts that must be removed in later stages, but it is no longer allowed to grow or accept new feature logic.

Runtime entrypoint now imports:

```text
src/app/runtime-compatibility.js
```

The checks enforce that `runtime-core.js` cannot be reintroduced.

## Stage 26B — React action bridge removal

React modules no longer call `window.__WorkspaceApp.actions`. The temporary runtime compatibility object may still expose legacy actions for remaining non-React zones, but React-facing mutations now go directly through `src/react/actions/workspaceActions.ts`, which constructs typed controllers over `createWorkspaceRepositorySet(client)`.

Current boundary:

```text
React component / React modal
→ createWorkspaceReactActions()
→ typed action controllers
→ hardened repositories
→ services
→ Supabase
```

`runtime-compatibility.js` remains only for modal opening, legacy state exposure, reload/render callbacks and remaining non-React compatibility zones.

## Stage 26C — Query-owned data loading

Stage 26C moves workspace bootstrap loading away from direct legacy service fetches and into the React/TanStack Query + repository layer. The old `src/app/data-loader.js` remains as a compatibility entry point, but it now delegates to `loadWorkspaceBootstrapData()` and `loadWorkspaceTasksQueryData()` from the query/repository layer instead of importing `fetchProjectsRequired`, `fetchReferenceData`, `fetchTasksPaged` or `fetchActivityLog` directly.

New boundary:

```text
React/DataBridge or compatibility loader
→ workspaceBootstrapQuery
→ createWorkspaceRepositorySet()
→ repositories.workspace/tasks/projects
→ services
→ Supabase
```

`WorkspaceDataBridge` now runs `useWorkspaceBootstrapQuerySync()` and only seeds Query cache from legacy state as a fallback. Realtime invalidation now invalidates the bootstrap query as well, so React server-state can refresh through Query rather than relying only on legacy array mutation.

## Stage 26D — Pure realtime invalidation

Stage 26D removes the last legacy realtime-owned state mutation path. `src/app/realtime-bridge.js` is now a pure realtime event bridge: it normalizes Supabase realtime payloads, dispatches `workspace:realtime-change`, and lets `WorkspaceRealtimeProvider` invalidate TanStack Query keys.

Removed from realtime bridge:

```text
rtUpsert / rtRemove
legacy S.* array mutation
scheduleRender() from realtime payloads
loadTasksSafe() from realtime soft sync
fetchRealtimeSnapshot() from realtime bridge
```

Current realtime boundary:

```text
Supabase realtime payload
→ src/app/realtime-bridge.js compatibility subscription
→ dispatchWorkspaceRealtimeChange()
→ WorkspaceRealtimeProvider
→ invalidateRealtimeChange()
→ TanStack Query refresh
→ WorkspaceDataBridge store sync
```

A temporary `upsertLocalTaskComment()` wrapper remains in `runtime-compatibility.js`, but it is explicitly limited to optimistic local comment insertion and is not part of realtime.

## Stage 26E — React root / main.tsx cutover

Stage 26E replaces the old `src/app/bootstrap.js` entrypoint with a proper React root entry:

```text
index.html -> <div id="root"></div> -> src/app/main.tsx -> src/app/App.tsx
```

The remaining historical DOM shell is no longer embedded directly in `index.html`. It is isolated as a temporary compatibility template:

```text
src/app/legacy/legacyDomTemplate.ts
```

The module boot sequence that used to live in `bootstrap.js` now lives in:

```text
src/app/workspaceModuleLoader.ts
```

This keeps the existing compatibility modules loading in the correct order while making the application entrypoint a real React/Vite entry. New UI must not be added to the legacy template; new UI must be added as React pages/components.


## Stage 26F — pure React runtime cutover

Stage 26F removes the last runtime compatibility bridge. React no longer depends on `window.__WorkspaceApp` as a runtime API. App startup is owned by `src/app/main.tsx`, `src/app/App.tsx` and `src/app/workspaceRuntime.ts`.

New React work must use:

```text
useWorkspaceState()
useWorkspaceSelector()
useWorkspaceUiStore()
createWorkspaceReactActions()
TanStack Query hooks
repositories/controllers
```

Do not reintroduce legacy runtime globals, DOM-wide render functions, or `runtime-compatibility.js`.

## Stage 27 testing baseline

React modules are now protected by an expanded test baseline. Critical controller behavior, pure React runtime contracts, router/page contracts and realtime/query invalidation must stay covered. Add new model/controller tests under `tests/unit/*.test.mjs`; the runner discovers them automatically.

## Stage 28 — Supabase security audit

Stage 28 adds a formal Supabase security audit package. The frontend permission layer is treated as UI consistency only; the authoritative boundary is Supabase RLS and Storage policies.

Added artifacts:

```text
docs/supabase-security-audit.md
docs/supabase-security-matrix.json
supabase/migrations/005_security_hardening_audit.sql
tools/check-supabase-security.mjs
tests/unit/supabase-security-audit.test.mjs
```

The hardening migration drops historical permissive `anon` policies from early MVP setups, revokes protected workspace tables from `anon`, keeps workspace buckets private and adds `workspace_security_baseline_report()` for live database inspection.

Existing databases should run:

```text
supabase/migrations/005_security_hardening_audit.sql
```

New databases receive the same hardening because the migration is folded into the end of `supabase/setup.sql`.


## Stage 29 — React PWA lifecycle

React owns the PWA lifecycle UI through `src/react/pwa`. New UI should use the typed PWA client in `src/shared/pwa/pwaClient.ts`; do not reintroduce side-effect-only service worker registration logic inside React components.

## Stage 30 production boundary

React routes are lazy-loaded through `src/app/lazyPages.tsx` and rendered behind `React.Suspense`. The root app is wrapped by `AppErrorBoundary`. New production-facing React code should use the shared `src/shared/production` utilities rather than adding ad-hoc `console.error`, global timers or local loading fallbacks.
