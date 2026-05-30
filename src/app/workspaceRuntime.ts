import { appStore, exposeAppStore } from '../core/state/store';
import { getSupabaseClient } from '../core/supabase-client.js';
import { getAuthUser, getSessionUser, isRetryableAuthError, clearSupabaseAuthStorage, signInWithPassword, signOut } from '../services/auth.service.js';
import { bindProfileToAuthUser, fetchProfileByAuthUserId, fetchProfileByEmail } from '../services/workspace.service.js';
import { getWorkspacePermissionSnapshot } from '../core/permissions/index.js';
import { loadWorkspaceBootstrapData, createWorkspaceBootstrapStatePatch } from '../react/data/queries/workspaceBootstrapQuery';
import type { AppState, AppUser } from '../types/entities';

const INITIAL_STATE: Partial<AppState> = {
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
  logs: [],
  notifications: [],
  warnings: [],
  taskError: '',
  loading: false,
  tasksLoading: false,
  statusTitle: 'База подключена',
  statusText: 'Проверяю текущую сессию...'
};

let initialized = false;
let restoreInFlight: Promise<AppState> | null = null;

export function installWorkspaceStore() {
  if (!initialized) {
    appStore.replaceState({ ...INITIAL_STATE } as AppState, { source: 'react-runtime-init', stage: '26F' });
    exposeAppStore(appStore);
    initialized = true;
  }
  return appStore;
}

export function setWorkspaceStatus(title: string, text = '') {
  appStore.setState({ statusTitle: title, statusText: text } as Partial<AppState>, { source: 'react-status', stage: '26F' });
}

export function getWorkspaceRuntimeState(): AppState {
  installWorkspaceStore();
  return appStore.getState();
}

function setWorkspacePatch(patch: Partial<AppState>, source = 'react-runtime') {
  installWorkspaceStore();
  return appStore.setState(patch, { source, stage: '26F' });
}

async function resolveWorkspaceProfile(client: any, user: any): Promise<AppUser | null> {
  if (!user) return null;
  let profile: AppUser | null = null;
  try { profile = await fetchProfileByAuthUserId(client, user.id); } catch {}
  if (!profile && user.email) {
    profile = await fetchProfileByEmail(client, user.email);
    if (profile && !profile.auth_user_id) bindProfileToAuthUser(client, profile.id, user.id).then(() => undefined).catch(() => undefined);
  }
  return profile || null;
}

export async function restoreWorkspaceSession(): Promise<AppState> {
  installWorkspaceStore();
  if (restoreInFlight) return restoreInFlight;

  restoreInFlight = (async () => {
    try {
      const client = getSupabaseClient();
      setWorkspacePatch({ sb: client, loading: true, statusTitle: 'База подключена', statusText: 'Проверяю текущую сессию...' }, 'react-session-start');

      let user: any = null;
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
      const warnings: string[] = [];
      const bootstrap = await loadWorkspaceBootstrapData(client, { owner: profile.role === 'owner', warnings });
      const permissions = getWorkspacePermissionSnapshot(profile, bootstrap.projects, bootstrap.members);
      const patch = createWorkspaceBootstrapStatePatch(bootstrap, profile, permissions);
      setWorkspacePatch({ ...patch, user, profile, sb: client, loading: false, statusTitle: 'Подключено', statusText: `${profile.display_name || user.email || 'Пользователь'} · ${profile.role || 'member'} · проектов: ${bootstrap.projects.length} · задач: ${bootstrap.tasks.length}` }, 'react-bootstrap-loaded');
      return appStore.getState();
    } catch (error: any) {
      setWorkspacePatch({ loading: false, statusTitle: 'Ошибка загрузки базы', statusText: error?.message || String(error) }, 'react-bootstrap-error');
      return appStore.getState();
    } finally {
      restoreInFlight = null;
    }
  })();

  return restoreInFlight;
}

export async function signInWorkspace(email: string, password: string) {
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
  setWorkspacePatch({ ...INITIAL_STATE, sb: client, statusTitle: 'Вы вышли', statusText: 'Войдите по email и паролю.' } as Partial<AppState>, 'react-logout');
}

export function invalidateWorkspaceData() {
  return restoreWorkspaceSession();
}
