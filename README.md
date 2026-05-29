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

Оставшееся крупное ядро — `src/app/runtime-core.js`. Его нужно дальше уменьшать постепенно: сначала выносить оставшиеся compatibility wrappers и runtime-specific UI glue, затем расширять typecheck на feature-модули.


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

