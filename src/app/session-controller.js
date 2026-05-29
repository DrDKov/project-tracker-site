import {
  clearSupabaseAuthStorage,
  getAuthUser,
  getSessionUser,
  isRetryableAuthError,
  signInWithPassword as authSignInWithPassword,
  signOut as authSignOut
} from '../services/auth.service.js';
import {
  bindProfileToAuthUser,
  fetchProfileByAuthUserId,
  fetchProfileByEmail
} from '../services/workspace.service.js';

export function createSessionController(deps) {
  const { S, $, sb, status, render, load } = deps;

  async function restore() {
    sb();
    let sessionUser = null;

    try {
      sessionUser = await getSessionUser(S.sb);
    } catch (error) {
      console.warn('[auth] getSession failed', error);
      if (isRetryableAuthError(error)) {
        clearSupabaseAuthStorage();
        S.user = null;
        S.profile = null;
        if ($('authState')) $('authState').textContent = 'Auth: локальная сессия сброшена после сетевой ошибки. Войдите снова.';
        status('Ошибка авторизации', 'Локальная Supabase-сессия сброшена. Войдите снова по email и паролю.');
        return null;
      }
      throw error;
    }

    S.user = sessionUser || null;
    if (!S.user) {
      try {
        S.user = await getAuthUser(S.sb);
      } catch (error) {
        console.warn('[auth] getUser failed', error);
        if (isRetryableAuthError(error)) {
          clearSupabaseAuthStorage();
          S.user = null;
          S.profile = null;
          if ($('authState')) $('authState').textContent = 'Auth: локальная сессия сброшена после сетевой ошибки. Войдите снова.';
          status('Ошибка авторизации', 'Локальная Supabase-сессия сброшена. Войдите снова по email и паролю.');
          return null;
        }
        throw error;
      }
    }

    if (!S.user) {
      S.profile = null;
      if ($('authState')) $('authState').textContent = 'Auth: не выполнен вход';
      return null;
    }

    let profile = null;
    try {
      profile = await fetchProfileByAuthUserId(S.sb, S.user.id);
    } catch (error) {
      S.warnings.push(`profile/auth_user_id: ${error.message || error}`);
    }

    if (!profile && S.user.email) {
      try {
        profile = await fetchProfileByEmail(S.sb, S.user.email);
        if (profile && !profile.auth_user_id) bindProfileToAuthUser(S.sb, profile.id, S.user.id).then(() => 0);
      } catch (error) {
        S.warnings.push(`profile/email: ${error.message || error}`);
      }
    }

    S.profile = profile || null;
    if ($('authState')) {
      $('authState').textContent = S.profile
        ? `Auth: ${S.user.email} · ${S.profile.display_name} · ${S.profile.role}`
        : `Auth: ${S.user.email} · профиль не привязан`;
    }
    return S.user;
  }

  async function signIn() {
    const email = $('loginEmail')?.value.trim();
    const password = $('loginPassword')?.value || '';
    if (!email || !password) return alert('Введите email и пароль');
    status('Вход', 'Проверяю email и пароль...');
    await authSignInWithPassword(sb(), email, password);
    await restore();
    await load();
  }

  async function claim() {
    await restore();
    if (!S.user) return alert('Сначала войдите');
    const profile = await fetchProfileByEmail(S.sb, S.user.email);
    if (!profile) throw new Error('Профиль с таким email не найден');
    await bindProfileToAuthUser(S.sb, profile.id, S.user.id);
    await restore();
    await load();
  }

  async function logout() {
    await authSignOut(sb());
    S.user = null;
    S.profile = null;
    S.projects = [];
    S.tasks = [];
    if ($('authState')) $('authState').textContent = 'Auth: не выполнен вход';
    status('Вы вышли', 'Войдите по email и паролю');
    render();
  }

  return { restore, signIn, claim, logout };
}
