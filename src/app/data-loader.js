import {
  fetchActivityLog,
  fetchProjectsRequired,
  fetchReferenceData
} from '../services/workspace.service.js';
import { fetchTasksPaged } from '../services/tasks.service.js';

export function createRuntimeDataLoader(deps) {
  const { S, status, restore, render, owner, permissions, dedupeTaskAssignees, setupRealtime } = deps;

  async function loadTasksSafe(options = {}) {
    const silent = Boolean(options.silent);
    S.tasksLoading = true;
    S.taskError = '';

    try {
      if (!silent) status('Загрузка', 'Читаю tasks...');
      const rows = await fetchTasksPaged(S.sb, {
        page: 250,
        max: 5000,
        timeoutMs: 30000,
        onProgress: (count) => {
          if (!silent) status('Загрузка', `Читаю tasks: ${count}...`);
        }
      });
      S.tasks = rows.filter((task) => !task.deleted_at);
      return S.tasks;
    } catch (error) {
      S.taskError = error.message || String(error);
      S.warnings.push(`tasks: ${S.taskError}`);
      console.warn('[tasks] load failed', error);
      return S.tasks || [];
    } finally {
      S.tasksLoading = false;
    }
  }

  async function load() {
    if (S.loading) return;
    S.loading = true;

    try {
      await restore();
      if (!S.user) throw new Error('Сначала войдите по email и паролю');
      if (!S.profile) throw new Error('Профиль workspace не найден. Нажмите «Привязать профиль».');

      S.warnings = [];
      if (!S.users.length) S.users = [S.profile];

      status('Загрузка', 'Читаю projects...');
      S.projects = (await fetchProjectsRequired(S.sb, 12000)).filter((project) => !project.deleted_at);
      render();

      await loadTasksSafe();

      status('Загрузка', 'Читаю справочники...');
      const ref = await fetchReferenceData(S.sb, S.warnings);
      if (ref.users.length) S.users = ref.users;
      S.members = ref.members;
      S.permissions = permissions();
      S.assignees = ref.assignees;
      dedupeTaskAssignees();
      S.subtasks = ref.subtasks;
      S.taskComments = ref.taskComments;
      S.messages = ref.messages;
      S.logs = owner() ? await fetchActivityLog(S.sb, S.warnings) : [];
      if (!S.activeChat && S.projects[0]) S.activeChat = S.projects[0].id;

      render();
      setupRealtime();
      status(
        'Подключено',
        `${S.profile.display_name || S.user.email} · ${S.profile.role} · проектов: ${S.projects.length} · задач: ${S.tasks.length}${S.taskError ? ' · задачи не обновились' : ''}${S.warnings.length ? ` · предупреждения: ${S.warnings.length}` : ''}`
      );
    } catch (error) {
      status('Ошибка загрузки базы', error.message || String(error));
    } finally {
      S.loading = false;
    }
  }

  return { loadTasksSafe, load };
}
