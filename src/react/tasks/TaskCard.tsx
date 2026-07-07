// @ts-nocheck
import React from 'react';

/** @typedef {import('./taskCardModel.ts').TaskCardViewModel} TaskCardViewModel */
/**
 * @typedef {Object} TaskCardActions
 * @property {(taskId: string) => void | Promise<unknown>} [openTask]
 * @property {(taskId: string) => void | Promise<unknown>} [deleteTask]
 * @property {(taskId: string, done: boolean) => void | Promise<unknown>} [toggleTask]
 * @property {(taskId: string) => void | Promise<unknown>} [toggleTaskFavorite]
 * @property {(taskId: string, title: string) => void | Promise<unknown>} [addSubtask]
 * @property {(subtaskId: string, done: boolean) => void | Promise<unknown>} [toggleSubtask]
 * @property {(subtaskId: string) => void | Promise<unknown>} [deleteSubtask]
 */

/**
 * @param {React.SyntheticEvent} event
 */
function stopLegacyEvent(event) {
  event.stopPropagation();
  if (event.nativeEvent && typeof event.nativeEvent.stopImmediatePropagation === 'function') {
    event.nativeEvent.stopImmediatePropagation();
  }
}

/**
 * @param {{ model: TaskCardViewModel, actions?: TaskCardActions }} props
 */
function TaskSubtasks({ model, actions = {} }) {
  const { subtasks } = model;
  const subtaskStyle = /** @type {any} */ ({ '--pct': `${subtasks.percent}%`, '--accent': model.accentColor });

  async function submitSubtask(event) {
    event.preventDefault();
    stopLegacyEvent(event);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    if (!title) return;
    await actions.addSubtask?.(model.id, title);
    form.reset();
  }

  return (
    <div className="wk-sub" style={subtaskStyle}>
      <div className="wk-subh">
        <b>Подзадачи</b>
        <span>{subtasks.done}/{subtasks.total} · {subtasks.percent}%</span>
      </div>
      <div className="wk-subbar"><i /></div>
      {subtasks.items.length ? (
        <div className="wk-sublist">
          {subtasks.items.map((item) => (
            <label key={item.id} className={`wk-subrow ${item.isDone ? 'done' : ''}`}>
              <input
                className="wk-subcheck"
                key={`${item.id}:${item.isDone ? 'done' : 'open'}`}
                type="checkbox"
                defaultChecked={item.isDone}
                onChange={(event) => actions.toggleSubtask?.(item.id, event.currentTarget.checked)}
              />
              <span>{item.title}</span>
              <button type="button" onClick={(event) => { stopLegacyEvent(event); actions.deleteSubtask?.(item.id); }}>×</button>
            </label>
          ))}
        </div>
      ) : (
        <div className="muted wk-subempty">Подзадач пока нет.</div>
      )}
      <form className="wk-subadd" onSubmit={submitSubtask}>
        <input className="input wk-subadd-input" name="title" placeholder="Добавить подзадачу" />
        <button className="wk-subadd-btn" type="submit">+</button>
      </form>
    </div>
  );
}

/**
 * TaskCardContent is rendered inside the legacy article shell. The shell keeps
 * drag/drop compatibility while React owns the card presentation and events.
 *
 * @param {{ model: TaskCardViewModel, actions?: TaskCardActions }} props
 */
export function TaskCardContent({ model, actions = {} }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className={`task-fav-btn ${model.isFavorite ? 'active' : ''}`}
        aria-label="Избранное"
        title="Избранное"
        onPointerDown={stopLegacyEvent}
        onMouseDown={stopLegacyEvent}
        onClick={(event) => { stopLegacyEvent(event); actions.toggleTaskFavorite?.(model.id); }}
      >
        {model.isFavorite ? '★' : '☆'}
      </button>

      <label className="wk-done">
        <input
          key={`${model.id}:${model.isDone ? 'done' : 'open'}`}
          type="checkbox"
          defaultChecked={model.isDone}
          onChange={(event) => actions.toggleTask?.(model.id, event.currentTarget.checked)}
        />
        <span />
      </label>

      <div className="row">
        {model.showStatus ? <span className="badge status-badge">{model.statusLabel}</span> : null}
        <span className="badge">{model.priorityLabel}</span>
        {model.isOverdue ? <span className="badge high">Просрочено</span> : null}
      </div>

      <h4>
        {model.title}{' '}
        {model.isRecurring ? <span className="task-repeat-badge" title="Повторяется">↻</span> : null}
      </h4>
      <p>{model.projectName}</p>
      <p className="muted">{model.dateRange}</p>
      <p className="muted">{model.assigneesLabel}</p>
      {model.hasNotes ? <p className="muted task-desc-hint">Есть описание</p> : null}
      {model.doneMeta.visible ? (
        <p className="muted done-meta">Завершено: {model.doneMeta.date} · кем: {model.doneMeta.user}</p>
      ) : null}

      <TaskSubtasks model={model} actions={actions} />

      <div className="task-card-footer">
        <button type="button" className="task-comment-badge" onClick={(event) => { stopLegacyEvent(event); actions.openTask?.(model.id); }}>💬 {model.commentCount}</button>
        <div className={`task-more ${menuOpen ? 'open' : ''}`}>
          <button type="button" className="task-more-btn" onClick={(event) => { stopLegacyEvent(event); setMenuOpen((value) => !value); }}>⋯</button>
          <div className="task-more-menu" data-menu-id={model.id}>
            <button type="button" onClick={(event) => { stopLegacyEvent(event); setMenuOpen(false); actions.openTask?.(model.id); }}>Редактировать</button>
            <button type="button" className="danger" onClick={(event) => { stopLegacyEvent(event); setMenuOpen(false); actions.deleteTask?.(model.id); }}>Убрать</button>
          </div>
        </div>
      </div>
    </>
  );
}
