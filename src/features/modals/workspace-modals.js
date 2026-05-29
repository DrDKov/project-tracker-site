// @ts-check

/** @typedef {import('../../types/entities.js').AppState} AppState */
/** @typedef {import('../../types/entities.js').Task} Task */
/** @typedef {import('../../types/entities.js').Project} Project */
/** @typedef {import('../../types/entities.js').AppUser} AppUser */

/**
 * @param {{
 *   S: AppState,
 *   $: (id: string) => any,
 *   qa: (selector: string) => any[],
 *   byId: <T extends { id?: string }>(items: T[], id?: string | null) => T | undefined,
 *   pname: (projectId?: string | null) => string,
 *   tids: (task: Partial<Task>) => string[],
 *   renderAccess: () => void,
 *   fillTaskCalendarFields: (task: Partial<Task>) => void,
 *   setupTaskRecurrenceFields: (task: Partial<Task>, id?: string | null) => void,
 *   renderTaskCommentsModal: () => void
 * }} deps
 */
export function createWorkspaceModals(deps) {
  const {
    S,
    $,
    qa,
    byId,
    pname,
    tids,
    renderAccess,
    fillTaskCalendarFields,
    setupTaskRecurrenceFields,
    renderTaskCommentsModal
  } = deps;

  function openProject(id) {
    const project = id ? byId(S.projects, id) : {};
    $('projectId').value = project?.id || '';
    $('projectName').value = project?.name || '';
    $('projectOwner').value = project?.owner_id || S.profile?.id || '';
    $('projectStatus').value = project?.status || 'planned';
    $('projectPriority').value = project?.priority || 'medium';
    $('projectStart').value = project?.start_date || '';
    $('projectDeadline').value = project?.deadline || '';
    $('projectColor').value = project?.color || '#111827';
    $('projectNext').value = project?.next_step || '';
    $('projectDescription').value = project?.description || '';
    $('projectModal')?.showModal();
  }

  function openTask(id, projectId) {
    const task = id ? byId(S.tasks, id) : {};
    $('taskId').value = task?.id || '';
    $('taskTitle').value = task?.title || '';
    $('taskProject').value = task?.project_id || projectId || S.projects[0]?.id || '';
    qa('#taskAssignee option').forEach((option) => {
      option.selected = id ? tids(task).includes(option.value) : option.value === S.profile?.id;
    });
    $('taskStatus').value = task?.status || 'planned';
    $('taskPriority').value = task?.priority || 'medium';
    $('taskStart').value = task?.start_date || '';
    $('taskDue').value = task?.due_date || '';
    $('taskNotes').value = task?.notes || '';
    fillTaskCalendarFields(task);
    setupTaskRecurrenceFields(task, id);
    renderTaskCommentsModal();
    $('taskModal')?.showModal();
  }

  function openUser(id) {
    const user = id ? byId(S.users, id) : {};
    $('userId').value = user?.id || '';
    $('userName').value = user?.display_name || '';
    $('userEmail').value = user?.email || '';
    $('userRole').value = user?.role || 'member';
    $('userPosition').value = user?.position || '';
    $('userModal')?.showModal();
  }

  function openAccess(projectId) {
    $('accessProjectId').value = projectId;
    $('accessProjectTitle').textContent = pname(projectId);
    renderAccess();
    $('accessModal')?.showModal();
  }

  return { openProject, openTask, openUser, openAccess };
}
