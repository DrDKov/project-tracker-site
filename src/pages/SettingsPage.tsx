import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { Button, Card } from '../shared/ui';
import { claimWorkspaceProfile, logoutWorkspace, signInWorkspace } from '../app/workspaceRuntime';

export function SettingsPage() {
  const state = useWorkspaceState();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const hasSession = Boolean(state.user?.id || state.profile?.id);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try { await signInWorkspace(email, password); }
    catch (e: any) { setError(e?.message || String(e)); }
  }
  return (
    <section className="settings-grid react-settings-page">
      <Card>
        <div className="settings-card-inner">
          <div className="settings-status-badge">{hasSession ? 'Подключено' : 'Не авторизовано'}</div>
          <h3>Состояние workspace</h3>
          <p><b>{state.statusTitle || 'Статус'}</b></p>
          <p className="muted">{state.statusText || '—'}</p>
          <div className="settings-meta-grid">
            <div className="settings-meta-item"><b>Профиль</b><span>{state.profile?.display_name || state.profile?.email || 'не привязан'}</span></div>
            <div className="settings-meta-item"><b>Роль</b><span>{state.profile?.role || '—'}</span></div>
            <div className="settings-meta-item"><b>Данные</b><span>Проектов: {(state.projects || []).length} · задач: {(state.tasks || []).length}</span></div>
          </div>
          <div className="settings-actions-note">Здесь отображается состояние подключения, авторизации и текущего профиля приложения.</div>
        </div>
      </Card>
      <Card>
        <div className="settings-card-inner">
          <h3>{hasSession ? 'Аккаунт' : 'Вход'}</h3>
          <form onSubmit={submit} className="form-grid">
            <label><span>Email</span><input className="input" value={email} onChange={(e) => setEmail(e.currentTarget.value)} /></label>
            <label><span>Пароль</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} /></label>
            {error ? <div className="notice danger full">{error}</div> : null}
            <div className="actions full settings-auth-actions">
              <Button type="submit" variant="primary">{hasSession ? 'Войти другим аккаунтом' : 'Войти'}</Button>
              {hasSession ? <Button type="button" variant="secondary" onClick={() => claimWorkspaceProfile()}>Привязать профиль</Button> : null}
              {hasSession ? <Button type="button" variant="secondary" onClick={() => logoutWorkspace()}>Выйти</Button> : null}
            </div>
          </form>
        </div>
      </Card>
    </section>
  );
}
export default SettingsPage;
