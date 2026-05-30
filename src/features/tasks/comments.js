import { addTaskCommentRecord, deleteTaskCommentRecord } from '../../services/tasks.service.js';

export function createTaskCommentsFeature(deps) {
  const { S, $, esc, dt, byId, canDeleteComment, upsertLocalComment, scheduleRender } = deps;

  function taskCommentList(taskId) {
    return (S.taskComments || [])
      .filter((comment) => comment.task_id === taskId && !comment.deleted_at)
      .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  }

  function taskCommentCount(taskId) {
    return taskCommentList(taskId).length;
  }

  function commentAuthor(id) {
    const user = (S.users || []).find((item) => item.id === id);
    if (user) return user.display_name || user.email || 'Пользователь';
    if (S.profile && S.profile.id === id) return S.profile.display_name || S.profile.email || 'Вы';
    return 'Пользователь';
  }

  function renderTaskCommentsModal() {
    const taskId = $('taskId')?.value;
    const box = $('taskCommentsList');
    const counter = $('taskCommentsCount');
    if (!box) return;
    if (!taskId) {
      box.innerHTML = '<div class="empty">Сохраните задачу, чтобы добавить комментарии.</div>';
      if (counter) counter.textContent = '0';
      return;
    }

    const comments = taskCommentList(taskId);
    if (counter) counter.textContent = String(comments.length);
    box.innerHTML = comments.length
      ? comments.map((comment) => `
        <div class="task-comment" data-comment-id="${esc(comment.id)}">
          <div class="task-comment-meta">
            <b>${esc(commentAuthor(comment.user_id))}</b>
            <span>${dt(comment.created_at)}</span>
            ${canDeleteComment(comment) ? `<button type="button" data-action="delete-task-comment" data-id="${esc(comment.id)}">Удалить</button>` : ''}
          </div>
          <div class="task-comment-body">${esc(comment.body)}</div>
        </div>`).join('')
      : '<div class="empty">Комментариев пока нет</div>';
  }

  async function addTaskComment() {
    const taskId = $('taskId')?.value;
    const textarea = $('taskCommentText');
    if (!taskId || !textarea) return;

    const body = textarea.value.trim();
    if (!body) return;

    const row = { task_id: taskId, user_id: S.profile?.id || S.user?.id || null, body };
    let saved = await addTaskCommentRecord(S.sb, row);
    saved = saved || { ...row, id: `local-${Date.now()}`, created_at: new Date().toISOString() };

    if (typeof upsertLocalComment === 'function') upsertLocalComment(saved);
    else S.taskComments.push(saved);

    textarea.value = '';
    renderTaskCommentsModal();
    scheduleRender('task-comment-add');
  }

  async function deleteTaskComment(id) {
    const comment = byId(S.taskComments, id);
    if (comment) comment.deleted_at = new Date().toISOString();
    renderTaskCommentsModal();
    scheduleRender('task-comment-delete');

    try {
      await deleteTaskCommentRecord(S.sb, id);
    } catch (error) {
      if (comment) comment.deleted_at = null;
      renderTaskCommentsModal();
      scheduleRender('task-comment-delete-failed');
      throw error;
    }
  }

  function bind() {
    if (window.__TASK_COMMENTS_V118__) return;
    window.__TASK_COMMENTS_V118__ = true;

    document.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.task-more,.task-comment-badge')) event.stopPropagation();
    }, true);

    document.addEventListener('mousedown', (event) => {
      if (event.target.closest('.task-more,.task-comment-badge')) event.stopPropagation();
    }, true);

    document.addEventListener('click', async (event) => {
      const menuButton = event.target.closest('[data-action="task-menu"]');
      if (menuButton) {
        event.preventDefault();
        event.stopPropagation();
        const wrap = menuButton.closest('.task-more');
        document.querySelectorAll('.task-more.open').forEach((item) => {
          if (item !== wrap) item.classList.remove('open');
        });
        wrap?.classList.toggle('open');
        return;
      }

      if (!event.target.closest('.task-more')) {
        document.querySelectorAll('.task-more.open').forEach((item) => item.classList.remove('open'));
      }

      if (event.target.closest('[data-action="open-task"]')) requestAnimationFrame(renderTaskCommentsModal);

      const addButton = event.target.closest('[data-action="add-task-comment"]');
      if (addButton) {
        event.preventDefault();
        try { await addTaskComment(); }
        catch (error) { alert(`Не удалось добавить комментарий: ${error.message || error}`); }
      }

      const deleteButton = event.target.closest('[data-action="delete-task-comment"]');
      if (deleteButton) {
        event.preventDefault();
        try { await deleteTaskComment(deleteButton.dataset.id); }
        catch (error) { alert(`Не удалось удалить комментарий: ${error.message || error}`); }
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target && event.target.id === 'taskId') renderTaskCommentsModal();
    });
  }

  return {
    taskCommentList,
    taskCommentCount,
    renderTaskCommentsModal,
    addTaskComment,
    deleteTaskComment,
    bind
  };
}
