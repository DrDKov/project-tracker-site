// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { USER_ROLE_OPTIONS, createUserModalForm, userFormToSaveInput } from './modalModels.ts';

/** @typedef {ReturnType<typeof createUserModalForm>} UserModalFormState */

/**
 * @param {{
 *   dialog: HTMLDialogElement | null,
 *   actions: { saveUser: (id: string | null, row: ReturnType<typeof userFormToSaveInput>) => Promise<unknown> },
 *   registerApi: (api: { open: (user?: Partial<import('../../types/entities').AppUser> | null) => void }) => void
 * }} props
 */
export function UserModal({ dialog, actions, registerApi }) {
  const [form, setForm] = useState(() => createUserModalForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    registerApi({
      open(user = null) {
        setError('');
        setSaving(false);
        setForm(createUserModalForm(user));
        if (dialog && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
      }
    });
  }, [dialog, registerApi]);

  /** @param {keyof UserModalFormState} key */
  function field(key) {
    return {
      value: form[key] || '',
      onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await actions.saveUser(form.id || null, userFormToSaveInput(form));
      dialog?.close();
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
          <h3>{form.id ? 'Редактировать профиль' : 'Новый профиль пользователя'}</h3>
          <p className="muted">React-controlled форма пользователя. Сохранение идёт через typed team controller.</p>
        </div>
        <button className="x" data-close="userModal" type="button">✕</button>
      </div>
      <input id="userId" type="hidden" value={form.id} readOnly />
      <div className="form-grid react-controlled-modal-grid">
        <label><span>Имя</span><input className="input" id="userName" required {...field('display_name')} /></label>
        <label><span>Email</span><input className="input" id="userEmail" type="email" {...field('email')} /></label>
        <label><span>Роль</span><select className="input" id="userRole" {...field('role')}>{USER_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Должность / зона ответственности</span><input className="input" id="userPosition" {...field('position')} /></label>
      </div>
      {error ? <div className="notice danger react-controlled-modal-error">{error}</div> : null}
      <div className="modal-actions">
        <button className="btn secondary" data-close="userModal" disabled={saving} type="button">Отмена</button>
        <button className="btn primary" disabled={saving || !form.display_name.trim()} onClick={handleSubmit} type="button">{saving ? 'Сохраняю…' : 'Сохранить'}</button>
      </div>
    </>
  );
}
