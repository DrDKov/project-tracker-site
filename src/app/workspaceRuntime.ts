// @ts-nocheck
import { appStore, exposeAppStore } from '../core/state/store';
import { getSupabaseClient } from '../core/supabase-client.js';
import { getAuthUser, getSessionUser, isRetryableAuthError, clearSupabaseAuthStorage, signInWithPassword, signOut } from '../services/auth.service.js';
import { bindProfileToAuthUser, fetchProfileByAuthUserId, fetchProfileByEmail } from '../services/workspace.service.js';
import { getWorkspacePermissionSnapshot } from '../core/permissions/index.js';
import { loadWorkspaceBootstrapData, createWorkspaceBootstrapStatePatch } from '../react/data/queries/workspaceBootstrapQuery';
import { createWorkspaceRepositorySet } from '../repositories/index.ts';

const INITIAL_STATE = {
  sb: null,
  user: null,
  profile: null,
  view: 'overview',
  projects: [],
  tasks: [],
  users: [],
  members: [],
  assignees: [],
  subtasks: [],
  taskComments: [],
  messages: [],
  materialTemplates: [],
  materialFolders: [],
  materialFiles: [],
  notifications: [],
  warnings: [],
  taskError: '',
  loading: false,
  tasksLoading: false,
  statusTitle: 'База подключена',
  statusText: 'Проверяю текущую сессию...'
};

let initialized = false;
let restoreInFlight = null;

function normalizeMentionText(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9@._\-/\s]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

function mentionAliases(user) {
  const out = new Set();
  const display = String(user?.display_name || '').trim();
  const email = String(user?.email || '').trim();
  if (display) {
    out.add(display);
    const first = display.split(/\s+/).filter(Boolean)[0];
    if (first) out.add(first);
  }
  if (email) {
    out.add(email);
    out.add(email.split('@')[0]);
  }
  return Array.from(out).filter(Boolean).map((item) => normalizeMentionText(`@${item}`));
}

function commentMentionsUser(body, user) {
  const text = normalizeMentionText(body);
  if (!text || !user) return false;
  return mentionAliases(user).some((alias) => alias && text.includes(alias));
}

function taskTitleById(tasks) {
  return new Map((tasks || []).map((task) => [task.id, task.title || 'Задача']));
}

export function installWorkspaceStore() {
  if (!initialized) {
    appStore.replaceState({ ...INITIAL_STATE }, { source: 'react-runtime-init', stage: '26F' });
    exposeAppStore(appStore);
    initialized = true;
  }
  return appStore;
}

export function setWorkspaceStatus(title, text = '') {
  appStore.setState({ statusTitle: title, statusText: text }, { source: 'react-status', stage: '26F' });
}

export function getWorkspaceRuntimeState() {
  installWorkspaceStore();
  return appStore.getState();
}

function setWorkspacePatch(patch, source = 'react-runtime') {
  installWorkspaceStore();
  return appStore.setState(patch, { source, stage: '26F' });
}

async function resolveWorkspaceProfile(client, user) {
  if (!user) return null;
  let profile = null;
  try { profile = await fetchProfileByAuthUserId(client, user.id); } catch {}
  if (!profile && user.email) {
    profile = await fetchProfileByEmail(client, user.email);
    if (profile && !profile.auth_user_id) bindProfileToAuthUser(client, profile.id, user.id).then(() => undefined).catch(() => undefined);
  }
  return profile || null;
}

async function loadOptionalRuntimeData(client, profile, warnings, bootstrap = null) {
  const repositories = createWorkspaceRepositorySet(client);
  const patch = {};
  try {
    const bundle = await repositories.materials.bundle();
    patch.materialTemplates = (bundle.templates || []).filter((item) => !item?.deleted_at);
    patch.materialFolders = (bundle.folders || []).filter((item) => !item?.deleted_at);
    patch.materialFiles = (bundle.files || []).filter((item) => !item?.deleted_at);
  } catch (error) {
    warnings.push(`materials: ${error?.message || String(error)}`);
  }
  try {
    if (profile?.id) {
      const since = new Date(Date.now() - 45 * 86400000).toISOString();
      const rows = await repositories.notifications.recentTaskAssignees(profile.id, since);
      const titleMap = taskTitleById(bootstrap?.tasks || []);
      const assignmentNotifications = (rows || []).map((row) => ({
        id: `assignment:${row.task_id}:${row.created_at || ''}`,
        type: 'task_assigned',
        task_id: row.task_id,
        user_id: profile.id,
        title: 'Вам назначена задача',
        body: titleMap.get(row.task_id) || '',
        unread: true,
        is_read: false,
        created_at: row.created_at
      }));

      const recentComments = await repositories.notifications.recentComments(since, 200).catch(() => []);
      const mentionNotifications = (recentComments || [])
        .filter((comment) => comment?.task_id && comment?.user_id !== profile.id && commentMentionsUser(comment.body || comment.content || '', profile))
        .map((comment) => ({
          id: `mention:${comment.id || comment.task_id}:${comment.created_at || ''}`,
          type: 'task_mention',
          task_id: comment.task_id,
          user_id: profile.id,
          title: 'Вас упомянули в комментарии',
          body: `${titleMap.get(comment.task_id) || 'Задача'} · ${String(comment.body || comment.content || '').slice(0, 160)}`,
          unread: true,
          is_read: false,
          created_at: comment.created_at
        }));

      patch.notifications = assignmentNotifications.concat(mentionNotifications);
    }
  } catch (error) {
    warnings.push(`notifications: ${error?.message || String(error)}`);
  }
  patch.warnings = warnings;
  return patch;
}

export async function restoreWorkspaceSession() {
  installWorkspaceStore();
  if (restoreInFlight) return restoreInFlight;

  restoreInFlight = (async () => {
    try {
      const client = getSupabaseClient();
      setWorkspacePatch({ sb: client, loading: true, statusTitle: 'База подключена', statusText: 'Проверяю текущую сессию...' }, 'react-session-start');

      let user = null;
      try { user = await getSessionUser(client); }
      catch (error) {
        if (isRetryableAuthError(error)) {
          clearSupabaseAuthStorage();
          setWorkspacePatch({ user: null, profile: null, loading: false, statusText: 'Локальная сессия сброшена. Войдите снова.' }, 'react-session-reset');
          return appStore.getState();
        }
        throw error;
      }
      if (!user) user = await getAuthUser(client).catch(() => null);

      if (!user) {
        setWorkspacePatch({ user: null, profile: null, loading: false, statusTitle: 'База подключена', statusText: 'Войдите по email и паролю.' }, 'react-session-anonymous');
        return appStore.getState();
      }

      const profile = await resolveWorkspaceProfile(client, user);
      if (!profile) {
        setWorkspacePatch({ user, profile: null, loading: false, statusTitle: 'Профиль не найден', statusText: 'Нажмите «Привязать профиль» в настройках.' }, 'react-profile-missing');
        return appStore.getState();
      }

      setWorkspacePatch({ user, profile, statusTitle: 'Загрузка', statusText: 'Читаю workspace data...' }, 'react-profile-ready');
      const warnings = [];
      const bootstrap = await loadWorkspaceBootstrapData(client, { owner: profile.role === 'owner', warnings });
      const permissions = getWorkspacePermissionSnapshot(profile, bootstrap.projects, bootstrap.members);
      const patch = createWorkspaceBootstrapStatePatch(bootstrap, profile, permissions);
      const optionalPatch = await loadOptionalRuntimeData(client, profile, warnings, bootstrap);
      setWorkspacePatch({ ...patch, ...optionalPatch, user, profile, sb: client, loading: false, statusTitle: 'Подключено', statusText: `${profile.display_name || user.email || 'Пользователь'} · ${profile.role || 'member'} · проектов: ${bootstrap.projects.length} · задач: ${bootstrap.tasks.length}` }, 'react-bootstrap-loaded');
      return appStore.getState();
    } catch (error) {
      setWorkspacePatch({ loading: false, statusTitle: 'Ошибка загрузки базы', statusText: error?.message || String(error) }, 'react-bootstrap-error');
      return appStore.getState();
    } finally {
      restoreInFlight = null;
    }
  })();

  return restoreInFlight;
}

export async function signInWorkspace(email, password) {
  const client = getSupabaseClient();
  await signInWithPassword(client, email, password);
  return restoreWorkspaceSession();
}

export async function claimWorkspaceProfile() {
  const state = getWorkspaceRuntimeState();
  const client = state.sb || getSupabaseClient();
  const user = state.user || await getAuthUser(client);
  if (!user?.email) throw new Error('Сначала войдите по email и паролю');
  const profile = await fetchProfileByEmail(client, user.email);
  if (!profile) throw new Error('Профиль с таким email не найден');
  await bindProfileToAuthUser(client, profile.id, user.id);
  return restoreWorkspaceSession();
}

export async function logoutWorkspace() {
  const state = getWorkspaceRuntimeState();
  const client = state.sb || getSupabaseClient();
  await signOut(client);
  setWorkspacePatch({ ...INITIAL_STATE, sb: client, statusTitle: 'Вы вышли', statusText: 'Войдите по email и паролю.' }, 'react-logout');
}

export function invalidateWorkspaceData() {
  return restoreWorkspaceSession();
}
