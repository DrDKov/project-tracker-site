import React from 'react';
import { useWorkspaceState } from '../react/state/useWorkspaceStore';
import { Button, Card } from '../shared/ui';
import { claimWorkspaceProfile, logoutWorkspace, signInWorkspace } from '../app/workspaceRuntime';

export function SettingsPage() {
  const state = useWorkspaceState();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try { await signInWorkspace(email, password); }
    catch (e: any) { setError(e?.message || String(e)); }
  }
  return (
    <section className="settings-grid react-settings-page">
      <Card><h3>Состояние</h3><p><b>{state.statusTitle || 'Статус'}</b></p><p className="muted">{state.statusText || '—'}</p><p className="muted">Профиль: {state.profile?.display_name || state.profile?.email || 'не привязан'}</p></Card>
      <Card><h3>Вход</h3><form onSubmit={submit} className="form-grid"><label><span>Email</span><input className="input" value={email} onChange={(e) => setEmail(e.currentTarget.value)} /></label><label><span>Пароль</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} /></label>{error ? <div className="notice danger full">{error}</div> : null}<div className="actions full"><Button type="submit" variant="primary">Войти</Button><Button type="button" variant="secondary" onClick={() => claimWorkspaceProfile()}>Привязать профиль</Button><Button type="button" variant="secondary" onClick={() => logoutWorkspace()}>Выйти</Button></div></form></Card>
    </section>
  );
}
export default SettingsPage;
