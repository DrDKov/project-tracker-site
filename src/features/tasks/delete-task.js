import { delegate } from '../../core/dom.js';
import { escapeCssId } from '../../core/html.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { taskList, workspaceStore } from '../../core/workspace-context.js';
import { hardDeleteTask, softDeleteTask } from '../../services/tasks.service.js';

if (!window.__TASK_DELETE_FEATURE__) {
  window.__TASK_DELETE_FEATURE__ = true;

  function removeLocalTask(taskId) {
    try {
      const tasks = taskList();
      const index = tasks.findIndex((task) => task && task.id === taskId);
      if (index >= 0) tasks.splice(index, 1);
      const store = workspaceStore();
      if (store && typeof store.setState === 'function') store.setState({ tasks }, { source: 'delete-task-local', taskId });
    } catch {}

    const card = document.querySelector(`[data-task-id="${escapeCssId(taskId)}"]`);
    if (card) card.remove();

    const openMetric = document.getElementById('mOpen');
    if (openMetric) openMetric.textContent = String(Math.max(0, Number(openMetric.textContent || 0) - 1));
  }

  async function deleteTask(taskId) {
    const client = getSupabaseClient();
    try {
      await hardDeleteTask(client, taskId);
    } catch (hardDeleteError) {
      await softDeleteTask(client, taskId);
    }
  }

  delegate(document, 'click', '[data-action="delete-task"]', async (event, button) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const taskId = button.dataset.id;
    if (!taskId) return;
    if (!confirm('Убрать задачу?')) return;

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = 'Удаляю…';

    try {
      await deleteTask(taskId);
      removeLocalTask(taskId);
      const status = document.getElementById('sideStatusText');
      if (status) status.textContent = 'Задача удалена. Обновите страницу, если нужно пересчитать все показатели.';
    } catch (error) {
      button.disabled = false;
      button.textContent = previousText;
      const message = error && error.message ? error.message : String(error || '');
      alert('Не удалось удалить задачу. Проверьте права на проект или RLS-политику tasks_delete_project_editors. Технически: ' + message);
    }
  }, true);
}
