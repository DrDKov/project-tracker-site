// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { ACCESS_ROLE_OPTIONS, accessFormToSaveInput, createAccessModalForm, createUserOptions, userName } from './modalModels.ts';

/** @typedef {ReturnType<typeof createAccessModalForm>} AccessModalFormState */

/**
 * @param {{
 *   dialog: HTMLDialogElement | null,
 *   getState: () => import('../../types/entities').AppState,
 *   actions: {
 *     saveAccess: (row: ReturnType<typeof accessFormToSaveInput>) => Promise<unknown>,
 *     removeAccess: (memberId: string) => Promise<unknown>
 *   },
 *   registerApi: (api: { open: (project?: Partial<import('../../types/entities').Project> | null) => void, refresh: (projectId?: string | null) => void }) => void
 * }} props
 */
export function AccessModal({ dialog, getState, actions, registerApi }) {
  const [form, setForm] = useState(() => createAccessModalForm(null, []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const state = getState();
  const userOptions = useMemo(() => createUserOptions(state.users || []), [state.users]);

  function refreshFromState(projectId = form.project_id) {
    const nextState = getState();
    const project = (nextState.projects || []).find((item) => item.id === projectId) || { id: projectId };
    setForm((current) => ({ ...createAccessModalForm(project, nextState.members || []), user_id: current.user_id, access_role: current.access_role || 'viewer' }));
  }

  useEffect(() => {
    registerApi({
      open(project = null) {
        const nextState = getState();
        setError('');
        setSaving(false);
        setForm(createAccessModalForm(project, nextState.members || []));
        if (dialog && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
      },
      refresh(projectId = null) {
        refreshFromState(projectId || form.project_id);
      }
    });
  }, [dialog, registerApi]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await actions.saveAccess(accessFormToSaveInput(form));
      refreshFromState(form.project_id);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(memberId) {
    setSaving(true);
    setError('');
    try {
      await actions.removeAccess(memberId);
      refreshFromState(form.project_id);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal-head react-controlled-modal-head">
        <div>
          <h3>Участники и доступ к проекту</h3>
          <p className="muted">React-controlled управление доступами. RLS остаётся финальным уровнем защиты.</p>
        </div>
        <button className="x" data-close="accessModal" type="button">✕</button>
      </div>
      <input id="accessProjectId" type="hidden" value={form.project_id} readOnly />
      <div className="notice">Участники проекта управляются здесь. Доступ реально применяется на уровне PostgreSQL RLS.</div>
      <br />
      <div className="muted" id="accessProjectTitle">{form.project_name}</div>
      <br />
      <div className="form-grid react-controlled-modal-grid">
        <label><span>Пользователь</span><select className="input" id="accessUser" value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}><option value="">Выберите пользователя</option>{userOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Права</span><select className="input" id="accessRole" value={form.access_role} onChange={(event) => setForm((current) => ({ ...current, access_role: event.target.value }))}>{ACCESS_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      {error ? <div className="notice danger react-controlled-modal-error">{error}</div> : null}
      <div className="modal-actions">
        <button className="btn secondary" data-close="accessModal" disabled={saving} type="button">Закрыть</button>
        <button className="btn primary" disabled={saving || !form.project_id || !form.user_id} onClick={handleSubmit} type="button">{saving ? 'Сохраняю…' : 'Добавить / обновить'}</button>
      </div>
      <br />
      <div id="accessList" className="react-access-list">
        {form.members.length ? (
          <table className="access-table">
            <thead><tr><th>Участник</th><th>Права</th><th /></tr></thead>
            <tbody>
              {form.members.map((member) => (
                <tr key={member.id || `${member.project_id}:${member.user_id}`}>
                  <td>{userName(member.user_id, state.users || [])}</td>
                  <td>{member.access_role || 'viewer'}</td>
                  <td>{member.id ? <button className="btn sm danger" disabled={saving} onClick={() => handleRemove(member.id)} type="button">Удалить</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">Участники проекта не добавлены отдельно</div>}
      </div>
    </>
  );
}
