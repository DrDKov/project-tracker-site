# Architecture — Stage 9

Stage 9 adds gradual typing to the Vite vanilla JS application. The project is still framework-free and still uses the same Supabase public configuration, but core and service layers now have JSDoc contracts and TypeScript `checkJs` validation.

The goal is controlled hardening, not a risky rewrite. Type checking starts with the layers that define application contracts: state, selectors, permissions, Supabase services and shared utility modules.

## Current structure

```text
src/
  app/
    bootstrap.js
    runtime.js
    runtime-core.js
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

Large UI feature modules and `runtime-core.js` are not included in strict checking yet. They should be migrated module by module after their dependencies are stable.

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
3. Keep shrinking `src/app/runtime-core.js`; do not add new business logic there.
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

