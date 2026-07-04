import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { Button, Card } from '../shared/ui';
import { claimWorkspaceProfile, logoutWorkspace, signInWorkspace } from '../app/workspaceRuntime';

export function SettingsPage() {
  const state = useWorkspaceState();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const isSignedIn = Boolean(state.user);
  const accountEmail = state.user?.email || state.profile?.email || 'email не определен';
  const profileLabel = state.profile?.display_name || state.profile?.email || 'профиль не привязан';
  const roleLabel = state.profile?.role || 'роль не назначена';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try { await signInWorkspace(email, password); }
    catch (e: any) { setError(e?.message || String(e)); }
  }

  async function claimProfile() {
    setError('');
    try { await claimWorkspaceProfile(); }
    catch (e: any) { setError(e?.message || String(e)); }
  }

  return (
    <section className="settings-grid react-settings-page">
      <Card>
        <div className="settings-card-inner">
          <div className={`settings-status-badge ${isSignedIn ? 'connected' : ''}`}>
            {isSignedIn ? 'Сессия активна' : 'Требуется вход'}
          </div>
          <h3>Состояние workspace</h3>
          <p><b>{state.statusTitle || 'Статус'}</b></p>
          <p className="muted">{state.statusText || '-'}</p>
          <div className="settings-meta-grid">
            <div className="settings-meta-item"><b>Профиль</b><span>{profileLabel}</span></div>
            <div className="settings-meta-item"><b>Роль</b><span>{roleLabel}</span></div>
            <div className="settings-meta-item"><b>Данные</b><span>Проектов: {(state.projects || []).length} · задач: {(state.tasks || []).length}</span></div>
          </div>
          <div className="settings-actions-note">Здесь отображается состояние подключения, авторизации и текущего профиля приложения.</div>
        </div>
      </Card>
      <Card>
        <div className="settings-card-inner">
          {isSignedIn ? (
            <>
              <h3>Аккаунт</h3>
              <div className="settings-meta-grid">
                <div className="settings-meta-item"><b>Email</b><span>{accountEmail}</span></div>
                <div className="settings-meta-item"><b>Профиль</b><span>{profileLabel}</span></div>
              </div>
              {error ? <div className="notice danger">{error}</div> : null}
              <div className="actions settings-account-actions">
                {!state.profile ? <Button type="button" variant="secondary" onClick={claimProfile}>Привязать профиль</Button> : null}
                <Button type="button" variant="secondary" onClick={() => logoutWorkspace()}>Выйти</Button>
              </div>
            </>
          ) : (
            <>
              <h3>Вход</h3>
              <form onSubmit={submit} className="form-grid">
                <label><span>Email</span><input className="input" value={email} onChange={(e) => setEmail(e.currentTarget.value)} /></label>
                <label><span>Пароль</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} /></label>
                {error ? <div className="notice danger full">{error}</div> : null}
                <div className="actions full">
                  <Button type="submit" variant="primary">Войти</Button>
                  <Button type="button" variant="secondary" onClick={claimProfile}>Привязать профиль</Button>
                </div>
              </form>
            </>
          )}
        </div>
      </Card>
    </section>
  );
}

export default SettingsPage;
