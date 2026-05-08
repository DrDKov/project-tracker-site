# Project Tracker Workspace — clean v2

Чистая сборка без patch-зоопарка, дублирующих HTML-страниц, тестовых файлов и legacy entrypoint'ов.

## Состав

```text
project-tracker-site-clean-v2/
├── index.html
├── assets/
│   ├── app.css
│   └── app.js
└── supabase/
    └── setup.sql
```

## Важное отличие v2

Эта версия собрана на базе фактического runtime из исходного архива: `assets/workspace-main.js` v69. В исходном `workspace.html` старый `workspace-v4-core.js` выполнял bootstrap и загружал именно `workspace-main.js?v=69`. Поэтому v2 ближе к реальному рабочему приложению, чем сборка на базе старого `workspace-app.js` v66.

## Сохранённый контур

- Supabase Auth и настройка подключения через браузерные настройки;
- проекты, задачи, статусы, приоритеты, владельцы, сроки;
- Kanban и drag-and-drop изменения статуса;
- множественные исполнители;
- подзадачи;
- таймлайн;
- вехи;
- проектные чаты и вложения через Supabase Storage;
- команда и профили пользователей;
- роли, участники проектов, доступы;
- журнал / аудит для владельца;
- soft-delete;
- RLS-ориентированная схема Supabase.

## Что удалено

Удалены все отдельные `workspace-v*.js`, старые альтернативные HTML-страницы, `assets/clean`, тестовые файлы, `.github`, отдельные SQL-патчи и дублирующие runtime-файлы. В архиве оставлена одна точка входа, один CSS, один JS и один SQL-файл.

## Запуск

```bash
python -m http.server 8080
```

Открыть:

```text
http://localhost:8080/
```

## Supabase

1. Создайте проект Supabase.
2. Выполните `supabase/setup.sql` в SQL Editor.
3. Откройте приложение.
4. В настройках укажите Project URL и anon/publishable key.
5. Войдите или зарегистрируйте пользователя.
6. Назначьте владельца workspace, если это первичная настройка.

## Проверки

В архиве проверены: структура, отсутствие legacy-файлов, отсутствие старых script-ссылок, синтаксис `assets/app.js` через `node --check`.

Полный 100% функциональный эквивалент можно подтвердить только после ручного regression-test на реальной Supabase-базе.

<!-- trigger task card comments UI v118 -->
