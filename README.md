# Workspace Project Tracker — React Stage 4

Эта версия продолжает постепенную React-island миграцию без переписывания бизнес-логики. На Stage 4 в React перенесена структура модалки задачи, при этом старые DOM-id, form submit, Supabase actions, recurrence, комментарии и @mentions сохранены.

Проверка:

```bash
npm run check
npm run build
```

---

# Workspace Project Tracker — Stage 9

Статическое Supabase-backed SPA для GitHub Pages: проекты, задачи, таймлайн, чаты, команда, журнал, материалы владельца, уведомления и @упоминания.

Эта версия после Этапа 9: проект остаётся vanilla JS + Vite, но получил постепенную типизацию через JSDoc и TypeScript `checkJs`. Это не перевод на TypeScript-файлы и не React-переписывание. Цель этапа — начать ловить ошибки структуры данных до запуска приложения, не ломая текущую рабочую логику.

## Запуск

```bash
npm install
npm run dev
```

## Проверка и сборка

```bash
npm run check
npm run build
npm run preview
```

`npm run check` выполняет две проверки:

```text
node tools/check-project.mjs
npm run typecheck
```

`typecheck` запускает:

```text
tsc -p tsconfig.json --noEmit
```

Сейчас типизация включена постепенно для `src/core`, `src/services` и `src/types`. Большие UI-feature и legacy-runtime модули не переведены на строгую проверку одномоментно, чтобы не сломать приложение.

## Публикация на GitHub Pages

Загрузите проект в репозиторий и включите GitHub Pages через GitHub Actions. Workflow `.github/workflows/pages.yml` выполняет:

```text
npm ci
npm run check
npm run build
publish dist/
```

На GitHub Pages публикуется только production-сборка `dist/`.

## Supabase

Supabase URL и anon key сохранены в:

```text
public/config/supabase.js
```

Это публичный anon key. Service-role ключи нельзя хранить во фронтенд-проекте.

Для новой базы выполните:

```text
supabase/setup.sql
```

Для существующей базы используйте миграции из:

```text
supabase/migrations/
```

## Структура

```text
src/
  app/          # bootstrap, runtime orchestrator, session/data/realtime controllers
  core/         # store, selectors, permissions, DOM/html/storage utilities
  features/     # tasks, timeline, chat, materials, notifications, permissions, UI
  services/     # Supabase API/service layer
  styles/       # CSS layers imported by Vite
  types/        # JSDoc entity contracts and global declarations

public/
  assets/icons/
  config/supabase.js
  manifest.webmanifest
  service-worker.js

supabase/
  migrations/
  setup.sql

tools/
  check-project.mjs
```

## Правила дальнейшей разработки

1. Не добавлять новые Supabase-запросы напрямую в UI/feature-модули. Сначала расширять `src/services`.
2. Читать состояние через `src/core/workspace-context.js`, `src/core/state/selectors.js` или `window.__WorkspaceApp.store`.
3. Проверки ролей и доступов держать в `src/core/permissions`.
4. Новые сущности описывать в `src/types/entities.js`.
5. Для новых core/service модулей включать `// @ts-check` и JSDoc-контракты.
6. Перед публикацией запускать `npm run check` и `npm run build`.
7. Не создавать patch-файлы, параллельные экраны и дубли компонентов.

## Архитектурный статус

Проект уже прошёл этапы: декомпозиция runtime, service/API слой, единый store, permissions layer, вынос render/action/chat/timeline/comments/recurrence блоков, Vite-сборка, постепенная типизация.

Оставшееся крупное ядро — `src/app/runtime-compatibility.js`. Его нужно дальше уменьшать постепенно: сначала выносить оставшиеся compatibility wrappers и runtime-specific UI glue, затем расширять typecheck на feature-модули.


## Stage 10: type contracts and smoke tests

Stage 10 expands gradual `checkJs` coverage from `src/core` and `src/services` into stable renderer modules:

```text
src/features/app-shell/render.js
src/features/projects/render.js
src/features/tasks/card-renderer.js
src/features/team/render.js
src/features/access/render.js
src/features/audit/render.js
src/features/modals/workspace-modals.js
```

The project also includes Playwright smoke tests under `tests/smoke`. They verify that the Vite app shell loads, the runtime module is registered, and the public runtime API is exposed. The tests stub Supabase in the browser, so they do not write to the live Supabase database.

Use:

```bash
npm run check
npm run build
npm run test:smoke
```

On machines that already have a system Chromium but do not have Playwright-managed browsers installed, you can run:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:smoke
```

GitHub Actions installs a Playwright Chromium browser before running smoke tests.


## Stage 11: React island foundation

React has been added as an incremental UI layer, not as a full rewrite.

New files:

```text
src/react/core/createReactIsland.tsx
src/react/notifications/NotificationCenter.tsx
src/react/notifications/mountNotificationCenter.tsx
```

The first migrated surface is the notification panel renderer. Realtime subscriptions, mention validation, localStorage, task opening and Supabase calls remain in the existing feature/service architecture. React only renders the notification panel contents.

Commands remain the same:

```bash
npm run check
npm run build
```

Both commands must pass before deployment.

## React Stage 2: notification controller and typed adapter

The notification island is now more than a visual React wrapper. Notification data normalization, project-label hydration, localStorage serialization and duplicate assignment handling are centralized in:

```text
src/react/notifications/notificationModel.ts
```

The legacy notification feature still owns realtime subscriptions, mention validation and task opening, but it now delegates notification item creation, store normalization and unread counting to the typed React-adjacent adapter. This removes the separate DOM-patching `notification-project-labels` module and prevents the notification panel from being repaired by a second renderer after startup.

Notification CSS was also moved out of runtime JavaScript into:

```text
src/styles/notifications.css
```

A unit test protects the notification model behavior:

```text
tests/unit/notification-model.test.mjs
```

`npm run check` now runs:

```text
node tools/check-project.mjs
npm run typecheck
npm run test:unit
```

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


## React Stage 5 — TasksPage / TaskBoard island

The task board surface has been moved to React while preserving the existing task action and Supabase layers.

New files:

```text
src/react/tasks/taskBoardModel.ts
src/react/tasks/TaskBoard.tsx
src/react/tasks/mountTaskBoard.tsx
src/styles/task-board-react.css
tests/unit/task-board-model.test.mjs
```

The legacy `src/features/tasks/board-renderer.js` now acts as a board integration adapter. It still owns toolbar controls, persisted board mode, filters, assignee/week drag-drop, task ordering and date moves. React owns the task board presentation: status columns, assignee columns, week columns and task card rendering inside those columns.

Preserved behavior:

```text
status / assignee / week board modes
show/hide completed tasks
date filters
week navigation
drag-drop between assignees and days
existing TaskModal island
existing Supabase task actions
```

`npm run check` now includes `tests/unit/task-board-model.test.mjs`.
## React Stage 6 — ProjectsPage

React Stage 6 moves the Projects page presentation layer into React while preserving the existing project business logic.

Added:

```text
src/react/projects/projectModel.ts
src/react/projects/ProjectCard.tsx
src/react/projects/ProjectsPage.tsx
src/react/projects/mountProjectsPage.tsx
src/react/projects/README.md
src/styles/projects-react.css
tests/unit/project-model.test.mjs
```

The legacy adapter `src/features/projects/render.js` now builds a typed project view model and mounts the React ProjectsPage into the existing `#projectGrid`. The project modal, access modal, delete action, new-task action and Supabase service layer remain unchanged and continue to work through the existing `data-action` contract.

`npm run check` now includes the project model unit test.

## React Stage 7 — MaterialsPage

The owner-only Materials section is now rendered by a React island. Supabase Storage, templates, folders, signed URLs and owner permissions remain in the existing service/permission layers. The legacy feature module is now an integration adapter that creates the navigation entry, detects owner access, loads data through `materials.service.js` and mounts `src/react/materials/MaterialsPage.tsx`.

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

The project chat page is now rendered as a React island. The migration keeps the existing Supabase service layer and Storage upload flow intact while moving the UI for project selection, message list, attachments, search and composer into React.

Added files:

```text
src/react/chat/chatModel.ts
src/react/chat/ChatPage.tsx
src/react/chat/mountChatPage.tsx
src/react/chat/README.md
src/styles/chat-react.css
tests/unit/chat-model.test.mjs
```

The legacy `src/features/chat/index.js` now acts as an integration adapter: it builds a typed chat view model, mounts React, and keeps the existing send/delete/clear/upload operations in the service/action layer.

## React Stage 11 — AppShell

Stage 11 introduces a React-owned shell chrome while keeping the existing runtime as the compatibility/action/data layer.

Added:

```text
src/react/app-shell/appShellModel.ts
src/react/app-shell/AppShell.tsx
src/react/app-shell/mountAppShell.tsx
src/react/app-shell/README.md
src/styles/app-shell-react.css
tests/unit/app-shell-model.test.mjs
```

Scope of the React AppShell:

```text
sidebar brand
main navigation
topbar title and subtitle
global actions: refresh, settings, quick project, quick task
status block with legacy ids sideStatusTitle / sideStatusText
```

The main page sections remain owned by the already migrated React islands and the legacy runtime adapters. This stage deliberately preserves the existing `.view`, `data-view`, `pageTitle`, `pageSubtitle`, `sideStatusTitle`, `sideStatusText`, `refreshBtn`, `openSettingsBtn`, `quickProjectBtn` and `quickTaskBtn` contracts.

`npm run check` now includes the AppShell model unit test.

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

Stage 13 starts the real TypeScript migration without forcing a risky full rewrite. The stable React state layer now has TypeScript entrypoints, and canonical entity contracts are available as native `.ts` interfaces.

New TypeScript files:

```text
src/types/entities.ts
src/types/supabase.ts
src/react/state/workspaceSelectors.ts
src/react/state/useWorkspaceStore.tsx
src/react/state/WorkspaceStoreProvider.tsx
src/repositories/index.ts
src/repositories/tasks/taskRepository.ts
src/repositories/projects/projectRepository.ts
src/repositories/materials/materialRepository.ts
src/repositories/notifications/notificationRepository.ts
```

The old JSDoc `src/types/entities.js` remains for compatibility with existing `checkJs` modules and unit tests. New TypeScript/React code should import types from `src/types/entities.ts` through extensionless imports, for example:

```ts
import type { Task, Project, AppState } from '../types/entities';
```

Repository files are typed facades over the existing service layer. They do not replace Supabase services yet; they define the future typed API boundary for Stage 14 cleanup and testing.

## React Stage 14: tests and legacy cleanup

Stage 14 finishes the planned React migration cycle with verification hardening and conservative legacy cleanup.

Added tooling:

```bash
npm run test:unit
npm run check:architecture
```

`npm run test:unit` now discovers all `tests/unit/*.test.mjs` files automatically through `tools/run-unit-tests.mjs`, so new unit tests are included without editing a long package script.

`npm run check:architecture` validates architectural boundaries:

```text
- retired notification polling fallback is removed
- bootstrap does not load duplicate notification renderers
- React modules do not import legacy feature modules directly
- React components do not touch browser globals outside mount/adapter boundaries
- typed repositories delegate to service layer and do not call Supabase directly
```

Removed retired legacy file:

```text
src/features/notifications/polling-fallback.js
```

This fallback was no longer loaded and previously caused duplicate notification rendering during earlier stages. The canonical notification path is now the React NotificationCenter plus notification model/controller.

## Stage 15: runtime responsibilities inventory

Stage 15 does not delete `runtime-compatibility.js` by force. Instead it turns runtime removal into a controlled engineering process.

Added:

```text
docs/runtime-decomposition.md
docs/runtime-decomposition.json
tools/check-runtime-inventory.mjs
```

`docs/runtime-decomposition.md` maps every remaining function in `src/app/runtime-compatibility.js` to a status and target destination. `npm run check` now includes `npm run check:runtime`, which fails if a runtime function is added without being documented.

Safe cleanup performed in this stage:

```text
removed unused fetchProfileByEmail import from runtime-compatibility
removed unused subBlock wrapper
removed unused doneWho wrapper
removed unused clearChat wrapper
removed unused teardownRealtime wrapper
```

The remaining runtime file is explicitly treated as a temporary compatibility/action bridge. New feature logic must not be added there.

## Stage 16: typed action controllers

Stage 16 moves mutation responsibilities out of the legacy runtime action adapter into typed controller modules:

```text
src/controllers/tasks/taskActions.ts
src/controllers/projects/projectActions.ts
src/controllers/team/teamActions.ts
src/controllers/chat/chatActions.ts
src/controllers/materials/materialActions.ts
src/controllers/timeline/timelineActions.ts
src/controllers/shared/deleteActions.ts
```

The legacy `src/features/actions/runtime-actions.js` remains only as a DOM/form compatibility adapter. It no longer imports service functions directly. It reads the existing form ids, creates typed controller inputs and delegates mutations through controllers and repositories.

New rule: new React components and future controlled forms must call controllers or typed hooks, not legacy runtime actions and not raw Supabase services.


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

## Stage 18: React event ownership

Stage 18 reduces dependence on the legacy global `document` `data-action` event bus. The following React surfaces now use explicit React callbacks instead of primary `data-action` dispatch:

```text
TaskCard / TaskBoard
ProjectCard / ProjectsPage
UserCard / TeamPage
ChatPage message delete
```

The transitional boundary is:

```text
React component -> src/react/actions/workspaceActions.ts -> typed controllers -> hardened repositories
```

This is still a temporary bridge, but it is now explicit and isolated. The remaining `data-action` usage is limited to compatibility areas that will be removed in later stages: timeline handlers, task comment add/delete, modal compatibility IDs, fallback HTML and old feature adapters.

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

Stage 20 moves realtime updates toward the React data layer. The legacy realtime bridge still keeps the old runtime arrays in sync for compatibility, but every Supabase realtime payload now emits a typed workspace realtime event. React islands subscribe to that event through `WorkspaceRealtimeProvider` and invalidate TanStack Query keys instead of relying only on manual `render()` calls.

Added files:

```text
src/shared/realtime/realtimeEvents.ts
src/shared/realtime/realtimeInvalidation.ts
src/shared/realtime/realtimeClient.ts
src/shared/realtime/useWorkspaceRealtime.ts
src/shared/realtime/WorkspaceRealtimeProvider.tsx
```

Updated files:

```text
src/app/realtime-bridge.js
src/react/app/ReactAppProviders.tsx
tools/check-architecture.mjs
tests/unit/realtime-bridge-model.test.mjs
```

Current transitional path:

```text
Supabase realtime → shared realtime client → typed realtime event → TanStack Query invalidation → React UI refresh
```

The old runtime arrays and `scheduleRender()` are still updated temporarily so legacy compatibility surfaces continue working. The next steps should remove manual render scheduling after all pages read server-state from query hooks.

## Stage 21: Repository layer hardening

Stage 21 hardens the repository boundary as the canonical typed API surface above legacy services. New and migrated code should use `createWorkspaceRepositorySet(client)` rather than instantiating individual repositories in feature/query layers.

Added repository hardening files:

```text
src/repositories/repositoryError.ts
src/repositories/workspaceRepositories.ts
```

Repository calls are now wrapped through `repositoryCall()` / `repositorySync()` and raise typed `RepositoryError` instances with `domain` and `operation` metadata. This gives the controller/query layers a consistent failure boundary without exposing raw Supabase/service details.

Current canonical path:

```text
React UI / legacy adapters
  → typed controllers or query hooks
  → createWorkspaceRepositorySet(client)
  → domain repositories
  → legacy services
  → Supabase
```

Architecture checks now enforce that runtime adapters and query hooks use the repository set factory instead of direct individual repository construction.


## Stage 22 — Full TypeScript migration boundary

Stage 22 moves the React layer from mixed JS/JSX into TypeScript source files. `src/react` is now TypeScript-only: domain view models are `.ts`, React islands/components are `.tsx`, and unit tests run through `tsx` so they can import TypeScript modules directly.

Converted boundary examples:

```text
src/react/tasks/taskCardModel.ts
src/react/tasks/TaskCard.tsx
src/react/projects/projectModel.ts
src/react/materials/materialsModel.ts
src/react/team/teamModel.ts
src/react/timeline/timelineModel.ts
src/react/chat/chatModel.ts
src/react/app-shell/appShellModel.ts
src/react/core/createReactIsland.tsx
src/react/actions/workspaceActions.ts
src/react/state/workspaceStoreAdapter.ts
src/react/data/workspaceDataLayer.ts
```

Stage 22 keeps legacy adapters in JS where they still bridge old DOM contracts. The migration rule is now strict: new React code must be `.ts` or `.tsx`; JS is reserved only for remaining legacy adapters and low-level browser compatibility files until later cleanup stages.

## Stage 23: React Router / page architecture

Stage 23 adds an explicit router/page architecture while preserving the current compatibility bridge.

New files:

```text
src/app/router/workspaceRoutes.ts
src/app/router/routeSync.ts
src/app/router/useWorkspaceRoute.tsx
src/app/router/WorkspaceRouterProvider.tsx
src/app/router/mountWorkspaceRouter.ts
src/pages/
```

Routing now uses hash-based workspace routes, which are safe for GitHub Pages:

```text
#/tasks
#/projects
#/materials
#/timeline
```

The router currently synchronizes route changes with the existing runtime `setView()` bridge. This means URL navigation is available now, while existing DOM sections and React islands continue to work. Page files in `src/pages/` are typed route boundaries and will become full React page components when the final legacy adapters are removed.

## Stage 24 — Design system

Stage 24 adds the shared React UI boundary:

```text
src/shared/ui/
src/styles/design-system.css
```

New React UI should use shared primitives instead of creating one-off buttons, badges, cards, fields, tabs, dropdowns and empty states. The components intentionally keep compatibility with existing legacy classes such as `btn`, `badge`, `input` and `empty`, while adding `ds-*` classes and design tokens for the final React architecture.

Canonical import path:

```ts
import { Button, Badge, Card, EmptyState } from '../shared/ui';
```

Stage 24 does not change Supabase, controllers, repositories, routes or business logic. It standardizes the UI layer and prevents further visual fragmentation during the remaining legacy cleanup.

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


## Stage 26F — final runtime compatibility removal

Stage 26F removes the last runtime compatibility bridge:

```text
src/app/runtime-compatibility.js
src/app/runtime.js
src/app/data-loader.js
src/app/session-controller.js
src/app/legacy/legacyDomTemplate.ts
```

The application now starts from the React root and typed runtime bootstrap:

```text
src/app/main.tsx
src/app/App.tsx
src/app/workspaceRuntime.ts
```

The remaining initialization path is:

```text
main.tsx → App.tsx → ReactAppProviders → workspaceRuntime.ts → TanStack Query / repositories / Supabase
```

`window.__WorkspaceApp` is no longer part of the runtime contract. Shared state is exposed through `appStore`, React hooks and the query/UI-store layers.

## Stage 27 — Expanded tests

Stage 27 strengthens the project test net after the pure React runtime cutover. It adds behavioral tests for typed controllers, regression tests for task assignment diffing and safe storage keys, pure React runtime contract tests, router/page contract tests, and realtime/query invalidation coverage.

New test guard:

```bash
npm run check:tests
```

`npm run check` now includes `check:tests`, so new archives must keep the expanded test suite and smoke-test scaffolding intact.

Smoke tests now share a local Supabase browser stub in `tests/smoke/supabase-stub.js` and include React navigation checks in `tests/smoke/react-navigation.spec.js`. They do not write to the live Supabase database.

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

Stage 29 adds the production PWA layer:

```text
src/shared/pwa/pwaClient.ts
src/react/pwa/PwaLifecycle.tsx
src/react/pwa/PwaInstallPrompt.tsx
src/react/pwa/PwaUpdateBanner.tsx
src/react/pwa/PwaOfflineBanner.tsx
src/styles/pwa-mobile.css
public/offline.html
```

The service worker keeps Supabase requests out of the cache, caches only app-shell/static build assets, supports an offline fallback, and can activate updates through a user-facing update banner. Mobile standalone mode also gets safe-area and offline/standalone CSS states.

## Stage 30 — Performance and production hardening

Stage 30 adds production-grade runtime guards and performance boundaries without changing business logic:

```text
src/shared/production/ErrorBoundary.tsx
src/shared/production/LazyRouteFallback.tsx
src/shared/production/logger.ts
src/shared/production/performance.ts
src/app/lazyPages.tsx
src/styles/production-hardening.css
```

The React app is now wrapped in a top-level `AppErrorBoundary`, route pages are lazy-loaded through `React.lazy`/`Suspense`, and Vite has explicit manual chunk boundaries for React, TanStack Query, Zustand and major feature groups. Production checks are enforced through `npm run check:production` and included in `npm run check`.
