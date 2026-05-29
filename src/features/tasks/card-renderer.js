// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').Subtask} Subtask */

/**
 * @param {{
 *   S: AppState,
 *   esc: (value: unknown) => string,
 *   fmt: (value?: string | null) => string,
 *   dt: (value?: string | null) => string,
 *   rgba: (hex: string | undefined | null, alpha: number) => string,
 *   pcolor: (projectId?: string | null) => string,
 *   pname: (projectId?: string | null) => string,
 *   uname: (userId?: string | null) => string,
 *   tids: (task: Task) => string[],
 *   subs: (taskId: string) => Subtask[],
 *   today: () => string,
 *   PR: Record<string, string>,
 *   taskCommentList: (taskId: string) => unknown[]
 * }} deps
 */
export function createTaskCardRenderer(deps) {
  const { S, esc, fmt, dt, rgba, pcolor, pname, uname, tids, subs, today, PR, taskCommentList } = deps;

  /** @param {Task} task */
  function subtaskBlock(task) {
    const list = subs(task.id);
    const done = list.filter((item) => item.is_done).length;
    const percent = list.length ? Math.round(done / list.length * 100) : 0;
    const color = pcolor(task.project_id);

    return `<div class="wk-sub" style="--pct:${percent}%;--accent:${color}"><div class="wk-subh"><b>Подзадачи</b><span>${done}/${list.length} · ${percent}%</span></div><div class="wk-subbar"><i></i></div>${list.map((item) => `<label class="wk-subrow ${item.is_done ? 'done' : ''}"><input type="checkbox" data-action="toggle-subtask" data-id="${item.id}" ${item.is_done ? 'checked' : ''}><span>${esc(item.title)}</span><button type="button" data-action="delete-subtask" data-id="${item.id}">×</button></label>`).join('') || '<div class="muted">Подзадач пока нет.</div>'}<form class="wk-subadd" data-action="add-subtask" data-task-id="${task.id}"><input class="input" name="title" placeholder="Добавить подзадачу"><button type="submit">+</button></form></div>`;
  }

  /** @param {Task} task */
  function doneMeta(task) {
    const userId = task.completed_by_id || task.completed_by || task.closed_by_id || task.updated_by;
    return task.status === 'done'
      ? `<p class="muted done-meta">Завершено: ${dt(task.completed_at || task.updated_at)} · кем: ${esc(userId ? uname(userId) : '—')}</p>`
      : '';
  }

  /** @param {Task | null | undefined} task */
  function isFavorite(task) {
    return !!(task && task.is_favorite);
  }

  /** @param {string} taskId */
  function commentCount(taskId) {
    return taskCommentList(taskId).length;
  }

  /** @param {Task} task */
  function cardTask(task) {
    const overdue = task.status !== 'done' && task.due_date && task.due_date < today();
    const assignees = tids(task).map(uname).join(', ') || 'Не назначено';
    const favorite = isFavorite(task);
    const color = pcolor(task.project_id);

    return `<article class="task-card wk-task ${task.status === 'done' ? 'wk-complete' : ''} ${overdue ? 'overdue' : ''}" draggable="true" data-task-id="${task.id}" style="--accent:${color};--bg:${rgba(color, .12)};--bd:${rgba(color, .34)};"><button type="button" class="task-fav-btn ${favorite ? 'active' : ''}" data-id="${task.id}" aria-label="Избранное" title="Избранное">${favorite ? '★' : '☆'}</button><label class="wk-done"><input type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.status === 'done' ? 'checked' : ''}><span></span></label><div class="row"><span class="badge">${PR[task.priority] || task.priority || '—'}</span>${overdue ? '<span class="badge high">Просрочено</span>' : ''}</div><h4>${esc(task.title)} ${task.recurrence_rule_id ? '<span class="task-repeat-badge" title="Повторяется">↻</span>' : ''}</h4><p>${esc(pname(task.project_id))}</p><p class="muted">${fmt(task.start_date)} → ${fmt(task.due_date)}</p><p class="muted">${esc(assignees)}</p>${task.notes ? '<p class="muted task-desc-hint">Есть описание</p>' : ''}${doneMeta(task)}${subtaskBlock(task)}<div class="task-card-footer"><button type="button" class="task-comment-badge" data-action="open-task" data-id="${task.id}">💬 ${commentCount(task.id)}</button><div class="task-more"><button type="button" class="task-more-btn" data-action="task-menu" data-id="${task.id}">⋯</button><div class="task-more-menu" data-menu-id="${task.id}"><button type="button" data-action="open-task" data-id="${task.id}">Редактировать</button><button type="button" class="danger" data-action="delete-task" data-id="${task.id}">Убрать</button></div></div></div></article>`;
  }

  return { subtaskBlock, doneMeta, isFavorite, commentCount, cardTask };
}
