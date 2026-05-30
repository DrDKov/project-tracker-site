// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  createProjectModalForm,
  createUserOptions,
  projectFormToSaveInput
} from './modalModels.ts';

/** @typedef {ReturnType<typeof createProjectModalForm>} ProjectModalFormState */

/**
 * @param {{
 *   dialog: HTMLDialogElement | null,
 *   getState: () => import('../../types/entities').AppState,
 *   actions: { saveProject: (id: string | null, row: ReturnType<typeof projectFormToSaveInput>) => Promise<unknown> },
 *   registerApi: (api: { open: (project?: Partial<import('../../types/entities').Project> | null, options?: { defaultOwnerId?: string | null }) => void }) => void
 * }} props
 */
export function ProjectModal({ dialog, getState, actions, registerApi }) {
  const [form, setForm] = useState(() => createProjectModalForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const users = getState().users || [];
  const userOptions = useMemo(() => createUserOptions(users), [users]);

  useEffect(() => {
    registerApi({
      open(project = null, options = {}) {
        setError('');
        setSaving(false);
        setForm(createProjectModalForm(project, options));
        if (dialog && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
      }
    });
  }, [dialog, registerApi]);

  /** @param {keyof ProjectModalFormState} key */
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
      await actions.saveProject(form.id || null, projectFormToSaveInput(form));
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
          <h3>{form.id ? 'Редактировать проект' : 'Новый проект'}</h3>
          <p className="muted">React-controlled форма проекта. Сохранение идёт через typed project controller.</p>
        </div>
        <button className="x" data-close="projectModal" type="button">✕</button>
      </div>
      <input id="projectId" type="hidden" value={form.id} readOnly />
      <div className="form-grid react-controlled-modal-grid">
        <label><span>Название</span><input className="input" id="projectName" required {...field('name')} /></label>
        <label><span>Владелец</span><select className="input" id="projectOwner" {...field('owner_id')}><option value="">Не назначен</option>{userOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Статус</span><select className="input" id="projectStatus" {...field('status')}>{PROJECT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Приоритет</span><select className="input" id="projectPriority" {...field('priority')}>{PROJECT_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Дата старта</span><input className="input" id="projectStart" type="date" {...field('start_date')} /></label>
        <label><span>Срок</span><input className="input" id="projectDeadline" type="date" {...field('deadline')} /></label>
        <label><span>Цвет</span><input className="input" id="projectColor" type="color" {...field('color')} /></label>
        <label className="full"><span>Следующий шаг</span><input className="input" id="projectNext" {...field('next_step')} /></label>
        <label className="full"><span>Описание</span><textarea className="input textarea" id="projectDescription" {...field('description')} /></label>
      </div>
      {error ? <div className="notice danger react-controlled-modal-error">{error}</div> : null}
      <div className="modal-actions">
        <button className="btn secondary" data-close="projectModal" disabled={saving} type="button">Отмена</button>
        <button className="btn primary" disabled={saving || !form.name.trim()} onClick={handleSubmit} type="button">{saving ? 'Сохраняю…' : 'Сохранить'}</button>
      </div>
    </>
  );
}
