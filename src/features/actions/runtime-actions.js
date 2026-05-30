// @ts-check
import { createWorkspaceRepositorySet } from '../../repositories/index.ts';
import { createDeleteActionController } from '../../controllers/shared/deleteActions.ts';
import { createProjectActionController } from '../../controllers/projects/projectActions.ts';
import { createTaskActionController } from '../../controllers/tasks/taskActions.ts';
import { createTeamActionController } from '../../controllers/team/teamActions.ts';

/**
 * Legacy runtime action adapter.
 *
 * Stage 16 moves mutations into typed action controllers. This file intentionally
 * remains as a DOM/form compatibility layer until Stage 17/18 remove legacy form
 * ids and data-action events.
 */
export function createRuntimeActions(deps) {
  const { S, $, qa, byId, subs, load, render, renderTasks, renderTimeline, renderAccess, ensureTaskCalendarUi, readTaskCalendarFields, taskRecurrenceEnabled, createRecurringTasks } = deps;

  function repositories() { return createWorkspaceRepositorySet(S.sb); }

  function taskActions() {
    return createTaskActionController({
      state: S,
      repository: repositories().tasks,
      reload: load,
      render,
      renderTasks,
      renderTimeline,
      byId,
      subtasksForTask: subs,
      currentView: () => S.view,
      currentUserId: () => S.profile?.id || S.user?.id || null
    });
  }

  function projectActions() {
    return createProjectActionController({
      repository: repositories().projects,
      reload: load,
      renderAccess
    });
  }

  function teamActions() {
    return createTeamActionController({
      repository: repositories().users,
      reload: load
    });
  }

  function deleteActions() {
    return createDeleteActionController({
      repository: repositories().delete,
      reload: load,
      confirmDelete: (message) => confirm(message)
    });
  }

  function selectedTaskAssignees() {
    return qa('#taskAssignee option').filter((option) => option.selected).map((option) => option.value);
  }

  function closeDialog(id) {
    const dialog = $(id);
    if (dialog && typeof dialog.close === 'function') dialog.close();
  }

  async function saveProject(event) {
    event.preventDefault();
    const id = $('projectId').value || null;
    await projectActions().saveProject(id, {
      name: $('projectName').value.trim(),
      owner_id: $('projectOwner').value || null,
      status: $('projectStatus').value,
      priority: $('projectPriority').value,
      start_date: $('projectStart').value || null,
      deadline: $('projectDeadline').value || null,
      color: $('projectColor').value || '#111827',
      next_step: $('projectNext').value || null,
      description: $('projectDescription').value || null
    });
    closeDialog('projectModal');
  }

  async function saveTask(event) {
    event.preventDefault();
    ensureTaskCalendarUi();
    const id = $('taskId').value || null;
    const row = {
      title: $('taskTitle').value.trim(),
      project_id: $('taskProject').value,
      status: $('taskStatus').value,
      priority: $('taskPriority').value,
      start_date: $('taskStart').value || null,
      due_date: $('taskDue').value || null,
      notes: $('taskNotes').value || null
    };
    try {
      Object.assign(row, readTaskCalendarFields());
    } catch (error) {
      alert(error.message || String(error));
      return;
    }

    const assigneeIds = selectedTaskAssignees();
    row.assignee_id = assigneeIds[0] || null;
    const createRecurring = !id && typeof taskRecurrenceEnabled === 'function' && taskRecurrenceEnabled()
      ? createRecurringTasks
      : undefined;

    try {
      await taskActions().saveTask({ ...row, assigneeIds }, { id, createRecurring });
      closeDialog('taskModal');
    } catch (error) {
      alert(error.message || String(error));
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    const id = $('userId').value || null;
    await teamActions().saveUser(id, {
      display_name: $('userName').value.trim(),
      email: $('userEmail').value.trim() || null,
      role: $('userRole').value,
      position: $('userPosition').value || null,
      is_active: true
    });
    closeDialog('userModal');
  }

  async function saveAccess(event) {
    event.preventDefault();
    await projectActions().saveAccess({
      project_id: $('accessProjectId').value,
      user_id: $('accessUser').value,
      access_role: $('accessRole').value
    });
  }

  async function del(table, id) {
    await deleteActions().softDelete(table, id);
  }

  async function saveProjectData(id, row) {
    return projectActions().saveProject(id || null, row);
  }

  async function saveUserData(id, row) {
    return teamActions().saveUser(id || null, row);
  }

  async function saveAccessData(row) {
    return projectActions().saveAccess(row);
  }

  return {
    saveProject,
    saveTask,
    saveUser,
    saveAccess,
    saveProjectData,
    saveUserData,
    saveAccessData,
    del,
    toggleTask: (...args) => taskActions().toggleTask(...args),
    moveTask: (...args) => taskActions().moveTask(...args),
    updateTaskTimeline: (...args) => taskActions().updateTaskTimeline(...args),
    toggleTaskFavorite: (...args) => taskActions().toggleFavorite(...args),
    addSubtask: (...args) => taskActions().addSubtask(...args),
    toggleSubtask: (...args) => taskActions().toggleSubtask(...args),
    deleteSubtask: (...args) => taskActions().deleteSubtask(...args),
    deactivateUser: (...args) => teamActions().deactivateUser(...args),
    removeAccess: (...args) => projectActions().removeAccess(...args)
  };
}
