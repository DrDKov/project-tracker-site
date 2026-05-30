# Architecture — Stage 9

Stage 9 adds gradual typing to the Vite vanilla JS application. The project is still framework-free and still uses the same Supabase public configuration, but core and service layers now have JSDoc contracts and TypeScript `checkJs` validation.

The goal is controlled hardening, not a risky rewrite. Type checking starts with the layers that define application contracts: state, selectors, permissions, Supabase services and shared utility modules.

## Current structure

```text
src/
  app/
    bootstrap.js
    runtime.js
    runtime-compatibility.js
    session-controller.js
    data-loader.js
    realtime-bridge.js

  core/
    dom.js
    html.js
    storage.js
    supabase-client.js
    workspace-context.js
    permissions/
    state/

  services/
    auth.service.js
    workspace.service.js
    tasks.service.js
    chat.service.js
    materials.service.js
    notifications.service.js
    realtime.service.js
    supabase-result.js

  features/
    actions/
    app-shell/
    chat/
    materials/
    mentions/
    notifications/
    permissions/
    tasks/
    timeline/
    ui/

  styles/

  types/
    entities.js
    globals.d.ts
```

## Build boundary

The application is built by Vite.

```html
<script type="module" src="/src/app/bootstrap.js"></script>
```

CSS enters the graph from:

```js
import '../styles/main.css';
```

Public runtime-editable files live under `public/`. Generated deployment output is `dist/` and must not be edited manually.

## Typed contracts

Canonical entity contracts are in:

```text
src/types/entities.js
```

This file defines JSDoc types for:

```text
AuthUser
AppUser
Project
ProjectMember
Task
TaskAssignee
Subtask
TaskComment
ProjectMessage
NotificationRecord
WorkspacePermissionSnapshot
AppState
```

Browser globals used by the legacy runtime and Supabase CDN loading are declared in:

```text
src/types/globals.d.ts
```

The TypeScript config is intentionally gradual:

```text
tsconfig.json
```

It currently checks:

```text
src/types/**
src/core/**
src/services/**
```

Large UI feature modules and `runtime-compatibility.js` are not included in strict checking yet. They should be migrated module by module after their dependencies are stable.

## State model

The canonical store lives in:

```text
src/core/state/store.js
src/core/state/selectors.js
```

The historical `S` object is bridged to `appStore.legacyState`, so old runtime code remains compatible while new modules can use:

```js
window.__WorkspaceApp.store.getState();
window.__WorkspaceApp.store.subscribe(({ state, meta }) => {});
window.__WorkspaceApp.store.select((state) => state.tasks, (tasks) => {});
```

## Service/API layer

Supabase table/RPC/storage calls are grouped under `src/services`. Feature modules and UI event handlers should call service functions instead of calling `client.from(...)` directly.

Main service boundaries:

```text
auth.service.js           auth session, sign-in, sign-out
workspace.service.js      users, profiles, projects, members, bootstrap data, audit
tasks.service.js          tasks, assignees, comments, subtasks, recurrence, deletion
chat.service.js           project chat and chat file uploads
materials.service.js      owner-only templates, folders and material files
notifications.service.js  notification data and task notification channel
realtime.service.js       workspace realtime channel helpers
supabase-result.js        shared result/timeout helpers
```

## Permissions

Canonical frontend permissions are in:

```text
src/core/permissions/workspace-permissions.js
```

This layer covers workspace owner/admin checks, project access, owner-only materials, audit visibility, comment deletion and @mention visibility.

Frontend permission checks are a UI consistency layer only. Database security must still be enforced by Supabase RLS. Matching SQL helper functions are included in:

```text
supabase/migrations/004_workspace_permissions_helpers.sql
```

## Refactor history

Stage 1: isolated runtime core and moved standalone UI enhancers into feature modules.

Stage 2: introduced service/API layer for Supabase operations.

Stage 3: added canonical state store and live compatibility globals.

Stage 4: added canonical permission layer and Supabase permission helper migration.

Stage 5: extracted renderers for shell, projects, tasks, team, audit, access and modals.

Stage 6: extracted calendar timeline renderer, chat feature, runtime actions and global bindings.

Stage 7: extracted task comments, recurrence, favorites, session controller, data loader and realtime bridge.

Stage 8: migrated to Vite without React.

Stage 9: added JSDoc entity contracts, global declarations and TypeScript `checkJs` validation for core/service layers.

## Development rules

1. Do not add new raw Supabase calls in feature modules. Add or extend a service function.
2. Keep `public/config/supabase.js` as the bundled public Supabase config source.
3. Keep shrinking `src/app/runtime-compatibility.js`; do not add new business logic there.
4. Read shared state through `workspace-context.js`, selectors or `window.__WorkspaceApp.store`.
5. Put access checks into `src/core/permissions`.
6. Add or update JSDoc types in `src/types/entities.js` when adding data fields.
7. Run `npm run check` and `npm run build` before deploying.
8. Do not create patch files, duplicate screens or experimental parallel components.

## Recommended next stage

Stage 10 should expand type checking into selected feature modules, starting with low-risk modules: task card renderer, project renderer, team renderer and access renderer. After that, move toward Playwright smoke tests for login, task creation, comment creation, @mention notification and owner-only materials visibility.


## Stage 10 boundary

Stage 10 adds two safeguards without changing the runtime architecture:

1. Renderer modules now have JSDoc contracts and are included in TypeScript `checkJs`. This catches entity-shape mistakes in the shell, project cards, task cards, team rendering, access rendering, audit rendering and workspace modal wiring.
2. Browser-level smoke tests live in `tests/smoke`. They load the Vite app, replace the external Supabase browser client with an in-memory stub, and verify that bootstrap/runtime initialization completes without touching production data.

Do not bypass these checks when changing renderer modules. Add new feature modules to `tsconfig.json` only after they have stable JSDoc contracts and pass `npm run typecheck`.


## Stage 11: React island foundation

This archive introduces React without rewriting the existing application. The current vanilla/Vite runtime remains the source of truth for business logic, Supabase access, permissions, tasks, projects, chat, timeline and materials.

New React boundary:

```text
src/react/core/createReactIsland.tsx
src/react/notifications/NotificationCenter.tsx
src/react/notifications/mountNotificationCenter.tsx
```

The first React island is the notification center UI. The existing notifications feature still owns realtime subscriptions, localStorage state, mention validation and task opening logic. React owns only the rendering of the notification panel body. This keeps the migration incremental and reversible while replacing one fragile manual DOM-render block with a component boundary.

Vite now uses `@vitejs/plugin-react`, and `tools/check-project.mjs` validates JSX imports as part of the project check.

Rules for the next React migration steps:

1. Keep React as islands until the legacy runtime has been fully decomposed.
2. Do not move Supabase calls into React components.
3. React components receive data and callbacks from feature modules; they do not own application services.
4. Move one stable UI surface at a time: notifications, then task card, then task modal, then task board.
5. Preserve the existing `src/services`, `src/core/permissions` and `src/core/state` boundaries.

Notification policy update in this archive:

- `task_assignees` insert still creates “Вам назначили задачу”.
- Saving an already assigned task no longer recreates assignment rows because `replaceTaskAssignees()` is diff-based.
- A meaningful task update for an already assigned task can create “Ваша задача изменена”, throttled per task to reduce noise.

## React Stage 2

React migration remains island-based, but the notification island now has a typed data boundary instead of receiving raw legacy state directly. The boundary is:

```text
src/react/notifications/notificationModel.ts
```

Responsibilities moved into this model layer:

```text
notification id generation
notification type/title labels
project label resolution from task/project state
localStorage read/write helpers
normalization of old stored notifications
unread count calculation
duplicate assignment replacement
```

The existing `src/features/notifications/index.js` remains the integration controller for realtime, mentions and task opening. It now delegates notification item construction and hydration to the typed model and renders through `NotificationCenter.tsx`. There is one notification renderer; the old project-label DOM patcher is no longer loaded.

Notification presentation CSS now lives in `src/styles/notifications.css` and is bundled by Vite through `src/styles/main.css`.

Unit coverage for this model lives in `tests/unit/notification-model.test.mjs` and is part of `npm run check`.

## React Stage 3 — TaskCard island

TaskCard presentation has been moved to React without taking over the whole task board. The implementation keeps the existing vanilla board renderer, drag/drop behavior, filters, task actions and Supabase services intact.

New files:

```text
src/react/tasks/taskCardModel.ts
src/react/tasks/TaskCard.tsx
src/react/tasks/mountTaskCards.tsx
src/react/tasks/README.md
tests/unit/task-card-model.test.mjs
```

The legacy `src/features/tasks/card-renderer.js` now acts as an integration adapter. It creates a stable legacy `<article class="task-card">` shell for compatibility, then mounts React into that shell. If React mounting is delayed, the shell still contains equivalent fallback markup, so the board remains usable.

Rules preserved:

```text
React components do not call Supabase directly.
Task board filtering/columns/drag-drop remain in the existing board renderer.
TaskCard model is pure and covered by a unit test.
npm run check includes the new TaskCard model test.
```

## React Stage 4 — TaskModal island

Stage 4 moves the task modal markup into a React island while preserving the legacy task action pipeline. The React component renders the existing task form structure with stable DOM ids (`taskTitle`, `taskProject`, `taskAssignee`, `taskStatus`, recurrence fields, comment fields). Existing modules continue to own value hydration, form submission, recurrence creation, comment mutations, mentions and Supabase persistence.

New files:

```text
src/react/tasks/taskModalModel.ts
src/react/tasks/TaskModal.tsx
src/react/tasks/mountTaskModal.tsx
src/styles/task-modal-react.css
tests/unit/task-modal-model.test.mjs
```

The modal is intentionally uncontrolled from React. This prevents duplicate sources of truth during the migration and lets the old runtime continue to read/write fields through stable ids until the full TasksPage migration is complete.


## React Stage 5 — TaskBoard island

Stage 5 migrates the task board presentation layer to React without moving task persistence or business actions into React components.

The new React board boundary is:

```text
src/react/tasks/taskBoardModel.ts
src/react/tasks/TaskBoard.tsx
src/react/tasks/mountTaskBoard.tsx
```

The adapter remains:

```text
src/features/tasks/board-renderer.js
```

Responsibilities are split deliberately:

```text
React model/component: board view model, columns, card placement, presentation
legacy adapter: toolbar controls, localStorage view preferences, drag/drop actions, Supabase task mutations
services: persistence and database access
```

This keeps the migration reversible and avoids a second task state source while moving the central TasksPage surface toward React.
## React Stage 6 — ProjectsPage

Projects page rendering now follows the same React-island migration strategy used for notifications and tasks. The boundary is:

- `src/react/projects/projectModel.ts`: pure model and filtering/progress rules.
- `src/react/projects/ProjectsPage.tsx`: page-level React renderer.
- `src/react/projects/ProjectCard.tsx`: project card component.
- `src/react/projects/mountProjectsPage.tsx`: island mount adapter.
- `src/features/projects/render.js`: legacy integration adapter preserving existing DOM ids and `data-action` semantics.

This stage intentionally does not migrate `ProjectModal` or `ProjectAccessModal`; those still live behind the compatibility modal layer. That keeps save/delete/access logic stable while the Projects page presentation layer moves to React.

Next stage in the fixed roadmap: React Stage 7 — MaterialsPage.

## React Stage 8 — TeamPage / Users / Permissions UI

Stage 8 migrates the team/users presentation layer to React without changing Supabase writes, RLS, Auth or the legacy user modal. The new React files are:

```text
src/react/team/teamModel.ts
src/react/team/UserCard.tsx
src/react/team/TeamPage.tsx
src/react/team/mountTeamPage.tsx
src/styles/team-react.css
tests/unit/team-model.test.mjs
```

`src/features/team/render.js` is now an adapter: it builds the typed team view model and mounts the React page into the existing `#userGrid` container.



## React Stage 9 — TimelinePage

TimelinePage has been migrated to a React island while preserving the existing runtime action layer. The adapter in `src/features/timeline/calendar-renderer.js` builds a typed view model and mounts `src/react/timeline/TimelinePage.tsx`. Existing handlers for timeline navigation, opening tasks, adding tasks on a day and clicking empty time slots continue to work through the same DOM ids and `data-action` contracts.

Added model tests:

```text
tests/unit/timeline-model.test.mjs
```

The test suite now covers notification, task card, task modal, task board, project, materials, team and timeline models.

## React Stage 10 — ChatPage

Stage 10 moves the chat presentation layer to React without changing the underlying Supabase chat services.

Boundary:

```text
src/react/chat/chatModel.ts      # pure model: active project, project options, message parsing, attachment parsing, filtering
src/react/chat/ChatPage.tsx      # React UI for project selector, search, messages, attachments and composer
src/react/chat/mountChatPage.tsx # island mount function
src/features/chat/index.js       # legacy integration adapter and Supabase mutations
```

The chat React island keeps the legacy DOM contracts required by runtime actions: `chatProject`, `chatSearch`, `chatMessages`, `chatText`, `chatFiles`, `sendChatBtn`, `chatFileSummary` and `data-action="delete-chat-message"`. React owns rendering; the feature adapter owns mutations and service calls.

## React Stage 11 — AppShell

Stage 11 moves the application shell chrome to React without replacing the full page tree in one risky step.

Boundary:

```text
src/react/app-shell/appShellModel.ts   # pure shell model: pages, permissions, metrics, status, active view
src/react/app-shell/AppShell.tsx       # sidebar and topbar React components
src/react/app-shell/mountAppShell.tsx  # mount/sync adapter over the existing DOM shell
src/styles/app-shell-react.css         # shell styling layer
```

The shell React island owns sidebar navigation and topbar actions. It still preserves legacy ids and `data-view` attributes so the existing runtime, event handlers, status updates and GitHub Pages/Vite build remain compatible.

The main content sections are not moved into a root `App.jsx` yet. They remain owned by the migrated page islands and compatibility adapters. This is intentional: the fixed roadmap requires AppShell first, then a single React state/data layer, then TypeScript/repository migration, then legacy cleanup.

New test boundary:

```text
tests/unit/app-shell-model.test.mjs
```

This verifies visible pages, owner-only sections, audit visibility, active page fallback and shell metrics.

## React Stage 12 — unified React state/data layer

Stage 12 introduces a single typed React-facing state/data layer over the existing `appStore`. This is intentionally an adapter stage, not a risky replacement of the current loader, realtime bridge or Supabase services.

New files:

```text
src/react/state/workspaceStoreAdapter.ts
src/react/state/useWorkspaceStore.tsx
src/react/state/WorkspaceStoreProvider.tsx
src/react/state/workspaceSelectors.ts
src/react/data/workspaceDataLayer.ts
tests/unit/workspace-state-model.test.mjs
```

React components should now read workspace data through `useWorkspaceState()`, `useWorkspaceSelector()` or the data-layer projections instead of reading `window.__WorkspaceApp` directly. Existing legacy adapters may still use the compatibility API until their pages are fully migrated.

The AppShell now uses the React state hook and receives status updates from `AppState.statusTitle/statusText` instead of polling DOM text.


## React Stage 13: TypeScript migration boundary

Stage 13 introduces native TypeScript contracts and typed repository facades while preserving the working JavaScript service/runtime architecture.

Added canonical native TypeScript contracts:

```text
src/types/entities.ts
src/types/supabase.ts
```

Converted low-risk React state files to TypeScript:

```text
src/react/state/workspaceSelectors.ts
src/react/state/useWorkspaceStore.tsx
src/react/state/WorkspaceStoreProvider.tsx
```

Added typed repository facades over current services:

```text
src/repositories/tasks/taskRepository.ts
src/repositories/projects/projectRepository.ts
src/repositories/materials/materialRepository.ts
src/repositories/notifications/notificationRepository.ts
src/repositories/index.ts
```

The repository layer is currently a typed boundary over `src/services`. It should become the preferred import surface for new TypeScript React modules. Existing services remain the single proven Supabase implementation until enough UI has moved to typed repositories.

Migration rule from this point forward: new React hooks, state modules and domain models should be `.ts`/`.tsx`; legacy adapters can remain `.js`/`.jsx` until their replacement is complete.

## Stage 14: verification and conservative legacy cleanup

Stage 14 intentionally does not delete `runtime-compatibility.js` blindly. The runtime still provides compatibility, data/action orchestration and bridge functions for the remaining legacy contracts. Removing it before all contracts are replaced would be unsafe.

What Stage 14 does instead:

```text
- removes the retired notification polling fallback
- replaces the hard-coded unit test chain with automatic unit test discovery
- adds architecture boundary validation
- adds tests for React boundaries, repository boundaries, PWA contracts and legacy cleanup
- keeps runtime-compatibility as a compatibility bridge until all old DOM contracts are fully retired
```

New verification files:

```text
tools/run-unit-tests.mjs
tools/check-architecture.mjs
tests/unit/legacy-cleanup.test.mjs
tests/unit/react-boundary.test.mjs
tests/unit/repository-boundary.test.mjs
tests/unit/pwa-contract.test.mjs
```

The cleanup rule after Stage 14 is strict: delete legacy files only when they are unreferenced, covered by an architecture check, and not needed for runtime compatibility.

## Stage 15: runtime decomposition contract

Stage 15 adds a formal inventory for the remaining `src/app/runtime-compatibility.js` responsibilities.

Files:

```text
docs/runtime-decomposition.md
docs/runtime-decomposition.json
tools/check-runtime-inventory.mjs
```

The inventory is now part of the build-quality gate through:

```bash
npm run check:runtime
```

This prevents uncontrolled growth of the legacy bridge. Any new function added to `runtime-compatibility.js` must be explicitly classified with a group, status, target destination and notes. The intended direction remains unchanged: action wrappers move to typed controllers, data loading moves to the React data/query layer, realtime moves to query invalidation, navigation moves to React Router/page state, and the runtime bridge is deleted only after its dependencies are gone.

## Stage 16: typed action controllers

Stage 16 adds the first typed action-controller layer between React/UI adapters and repositories.

Controller files:

```text
src/controllers/tasks/taskActions.ts
src/controllers/projects/projectActions.ts
src/controllers/team/teamActions.ts
src/controllers/chat/chatActions.ts
src/controllers/materials/materialActions.ts
src/controllers/timeline/timelineActions.ts
src/controllers/shared/deleteActions.ts
```

Repository additions:

```text
src/repositories/users/userRepository.ts
src/repositories/chat/chatRepository.ts
src/repositories/shared/deleteRepository.ts
```

Boundary policy:

```text
React/UI -> controllers -> repositories -> services -> Supabase
```

Controllers must not call Supabase directly and must not import `src/services/*`. Repositories still delegate to services while the service-to-repository migration is ongoing. The architecture checker now enforces the controller boundary.

`src/features/actions/runtime-actions.js` is now a compatibility adapter only. Its remaining job is to translate legacy DOM form ids and event objects into typed controller inputs until Stage 17/18 replaces legacy modal forms and `data-action` event wiring.

## Stage 18: data-action event-bus reduction

Stage 18 moves the first set of React pages away from the legacy global `document.addEventListener('click')` + `data-action` bus.

New boundary:

```text
src/react/actions/workspaceActions.ts
```

This file is the only React-side adapter allowed to touch `window.__WorkspaceApp` for event/action dispatch during the migration. React components receive action callbacks from their mount adapters and call typed runtime action surfaces instead of emitting `data-action` attributes.

Converted surfaces:

```text
src/react/tasks/TaskCard.tsx
src/react/tasks/TaskBoard.tsx
src/react/projects/ProjectCard.tsx
src/react/team/UserCard.tsx
src/react/chat/ChatPage.tsx
```

Remaining `data-action` usage is explicitly transitional: timeline, task comments, modal compatibility, fallback HTML and legacy feature adapters. The next stages should continue moving these areas to React handlers and typed controllers before deleting the runtime event bridge.

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


## Stage 20 — Realtime bridge rewrite

Stage 20 creates a typed realtime boundary under `src/shared/realtime` and wires it into the React provider tree.

New boundary:

```text
Supabase realtime payload
  -> src/shared/realtime/realtimeClient.ts
  -> src/shared/realtime/realtimeEvents.ts
  -> src/shared/realtime/WorkspaceRealtimeProvider.tsx
  -> src/shared/realtime/realtimeInvalidation.ts
  -> TanStack Query invalidation
```

`src/app/realtime-bridge.js` no longer imports low-level realtime service helpers directly. It uses the shared realtime subscription wrapper, dispatches typed `workspace:realtime-change` browser events and keeps the old `S` arrays updated only as a compatibility bridge.

Query invalidation rules are explicit:

```text
projects              -> projects + tasks
tasks                 -> tasks + notifications
app_users             -> users + tasks
project_members       -> members + projects + users
task_assignees        -> tasks + notifications
task_subtasks         -> tasks + notifications
task_comments         -> tasks + notifications
project_messages      -> chat(project_id)
material_*            -> materials
unknown table         -> workspace root
```

The remaining legacy responsibilities are intentional and temporary: `softRealtimeSync()` still refreshes runtime arrays, and `scheduleRender()` is still called for legacy adapters. Later stages should remove these once React pages are fully backed by query hooks and realtime invalidation.

## Stage 21 boundary

Stage 21 converts the repository layer from a collection of loose facades into a hardened typed boundary.

New boundary utilities:

```text
src/repositories/repositoryError.ts
src/repositories/workspaceRepositories.ts
```

Rules:

1. Domain repositories may delegate to `src/services`, but every service call must pass through the repository error boundary.
2. Controllers, React query hooks and runtime compatibility adapters should use `createWorkspaceRepositorySet(client)` instead of importing individual repository factories.
3. Repositories must not perform raw Supabase `.from()`, `.rpc()` or `.storage` calls. Raw Supabase remains contained in services until the later repository/service consolidation stage.
4. Repository failures should surface as `RepositoryError` with `domain` and `operation`, so future UI error reporting can be precise and consistent.

This stage does not delete services yet. It prepares the next consolidation step by making repositories the only approved data API boundary for controllers and query hooks.


## Stage 22 boundary

Stage 22 makes `src/react` TypeScript-only. The React layer no longer contains `.js` or `.jsx` source files. Pure view-model modules are `.ts`, and React components/mount boundaries are `.tsx`.

The unit test runner now uses the local `tsx` binary, so tests under `tests/unit` can import `.ts` and `.tsx` modules directly without a build step.

Rules after Stage 22:

1. New React modules must be `.ts` or `.tsx`.
2. Remaining `.js` files are legacy adapters, service implementations, runtime bridge files, or tooling.
3. `allowImportingTsExtensions` is enabled intentionally because this project uses explicit file extensions for ESM/Vite imports.
4. Architecture checks fail if `.js` or `.jsx` returns to `src/react`.
5. TypeScript strictness should be tightened gradually after runtime-compatibility and remaining legacy adapters are removed.

## Stage 23 — React Router / page architecture

Stage 23 introduces a page/router layer without deleting the compatibility bridge prematurely.

New boundaries:

```text
src/app/router/workspaceRoutes.ts        # canonical route registry
src/app/router/routeSync.ts              # hash route ↔ legacy runtime synchronization
src/app/router/useWorkspaceRoute.tsx     # React hook for route-aware shell/actions
src/app/router/WorkspaceRouterProvider.tsx
src/app/router/mountWorkspaceRouter.ts
src/pages/                               # typed page artifacts
```

The project now has explicit page definitions for:

```text
overview, projects, tasks, timeline, chat, team, materials, audit, settings
```

GitHub Pages remains safe because routing uses hash paths. The temporary route bridge keeps `runtime-compatibility.setView()` synchronized with URL changes until Stage 25/26 remove legacy adapters and the runtime bridge.

Current route flow:

```text
React AppShell navigation
→ react-router hash route
→ routeSync
→ compatibility setView()
→ existing DOM section activation / React islands
```

Target final route flow:

```text
React Router
→ pages/*
→ query/controllers/repositories
→ React-only UI
```

## Stage 24 — Design system

Stage 24 introduces a reusable design-system layer under `src/shared/ui` and `src/styles/design-system.css`.

The goal is to stop creating one-off UI primitives inside feature components. New React modules should import shared primitives from `src/shared/ui` and only use feature-specific CSS for layout and domain styling.

Initial primitives:

```text
Button
Badge
Card
Input / Select / Textarea / Field
Tabs
Dropdown
EmptyState
ModalHeader / ModalFooter
```

Design-system components are presentational only. They must not import repositories, controllers, Supabase services, runtime-compatibility, `window.__WorkspaceApp`, or legacy feature adapters.

Stage 24 consumers already migrated to shared primitives:

```text
src/react/app-shell/AppShell.tsx
src/react/projects/ProjectCard.tsx
src/react/team/UserCard.tsx
src/react/notifications/NotificationCenter.tsx
```

Architecture checks now enforce the presence of the shared UI boundary and prevent Stage 24 from being silently rolled back.

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


## Stage 26F — runtime compatibility bridge removed

Stage 26F deletes the final legacy runtime bridge. The project no longer contains `runtime-core.js`, `runtime-compatibility.js`, `runtime.js`, the legacy data loader, the legacy session controller, or the legacy DOM template.

Current application entry:

```text
src/app/main.tsx
```

Current app initialization:

```text
src/app/App.tsx
src/app/workspaceRuntime.ts
```

Current data path:

```text
React UI → hooks/controllers → TanStack Query / Zustand → repositories → services → Supabase
```

The runtime inventory is intentionally empty after this stage. Any new app-level behavior must be added to typed React, controller, repository, query, realtime or shared UI layers. Reintroducing `runtime-core.js`, `runtime-compatibility.js` or `window.__WorkspaceApp` is now treated as an architecture regression.

## Stage 27 — Expanded tests

Stage 27 adds a stronger verification layer around the clean React runtime:

- controller behavior tests for task/project/team/delete flows;
- storage and assignment regression tests for safe file keys and assignment diffing;
- pure React runtime contract tests to keep runtime-core/runtime-compatibility deleted;
- router/page contract tests to prevent page fallback regression;
- realtime/query invalidation tests;
- shared smoke-test Supabase stub and React navigation smoke specs;
- `tools/check-test-coverage.mjs` to keep the expanded suite from being accidentally reduced.

`npm run check` now includes `npm run check:tests` in addition to project, type, unit, runtime and architecture checks.

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


## Stage 29 — PWA and mobile polish

Stage 29 upgrades the existing baseline PWA into a production-safe mobile layer. The service worker now uses explicit cache versioning, an offline fallback page, update activation by `SKIP_WAITING`, and the same Supabase bypass rules for auth, realtime, storage, REST and functions requests.

New PWA/runtime files:

```text
src/shared/pwa/pwaClient.ts
src/react/pwa/PwaLifecycle.tsx
src/react/pwa/PwaInstallPrompt.tsx
src/react/pwa/PwaUpdateBanner.tsx
src/react/pwa/PwaOfflineBanner.tsx
src/styles/pwa-mobile.css
public/offline.html
```

React now owns the visible PWA lifecycle: install prompt, update banner, offline banner and standalone/mobile CSS states. The old `src/features/pwa/register.js` remains only as a compatibility wrapper and delegates into the typed PWA client.

Security rule remains unchanged: Supabase API/auth/realtime/storage requests must never be cached by the service worker.

## Stage 30 — Performance and production hardening

Stage 30 finalizes the migration plan with production hardening:

```text
React ErrorBoundary at the root
lazy route-level code splitting
explicit Vite manual chunks
performance mark/measure helpers
production-aware logging
idle/debounce utilities
production CSS fallback states
```

The application now has guardrails for UI render failures and route-level lazy loading. Performance instrumentation is intentionally lightweight and browser-native: it uses the Performance API, explicit budgets and production-aware logging rather than introducing a monitoring vendor dependency.
