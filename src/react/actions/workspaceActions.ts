// @ts-nocheck
import { navigateWorkspaceRoute } from '../../app/router/routeSync';
import { createWorkspaceRepositorySet } from '../../repositories/index.ts';
import { createTaskActionController } from '../../controllers/tasks/taskActions.ts';
import { createProjectActionController } from '../../controllers/projects/projectActions.ts';
import { createTeamActionController } from '../../controllers/team/teamActions.ts';
import { createChatActionController } from '../../controllers/chat/chatActions.ts';
import { createDeleteActionController } from '../../controllers/shared/deleteActions.ts';
import { appStore } from '../../core/state/store';
import { useWorkspaceUiStore } from '../../shared/store/uiStore';
import { workspaceQueryClient } from '../../shared/query/queryClient';
import { workspaceQueryKeys } from '../data/queries/workspaceQueryKeys';

const CHAT_BUCKET = 'project-chat-files';

function state() { return appStore.getState() || {}; }
function client() { return state().sb || null; }
function repositories() { return createWorkspaceRepositorySet(client()); }
function byId(items, id) { return (items || []).find((item) => item && item.id === id); }
function subtasksForTask(taskId) { return (state().subtasks || []).filter((item) => item && item.task_id === taskId && !item.deleted_at); }
function currentUserId() { const s = state(); return s.profile?.id || s.user?.id || null; }
function currentView() { return useWorkspaceUiStore.getState().activeView || 'overview'; }
function refreshLocalState(source = 'react-action-local') {
  const s = state();
  appStore.setState({
    tasks: [...(s.tasks || [])],
    subtasks: [...(s.subtasks || [])],
    taskComments: [...(s.taskComments || [])],
    projects: [...(s.projects || [])],
    notifications: [...(s.notifications || [])]
  }, { source, stage: 'react-actions' });
}

function message(value) { return value && typeof value === 'object' && 'message' in value ? String(value.message) : String(value || ''); }
async function guarded(fn) { try { return await fn(); } catch (error) { console.warn('[workspace-action]', error); if (typeof alert === 'function') alert(message(error)); throw error; } }
async function invalidateWorkspace() {
  await workspaceQueryClient.invalidateQueries({ queryKey: workspaceQueryKeys.root });
  await workspaceQueryClient.invalidateQueries({ queryKey: workspaceQueryKeys.bootstrap() });
  const mod = await import('../../app/workspaceRuntime');
  return mod.invalidateWorkspaceData();
}

function taskController() {
  return createTaskActionController({
    state: state(),
    repository: repositories().tasks,
    reload: invalidateWorkspace,
    render: () => refreshLocalState('react-task-render'),
    renderTasks: () => refreshLocalState('react-task-render-tasks'),
    renderTimeline: () => refreshLocalState('react-task-render-timeline'),
    byId,
    subtasksForTask,
    currentView,
    currentUserId
  });
}
function projectController() { return createProjectActionController({ repository: repositories().projects, reload: invalidateWorkspace, renderAccess: () => refreshLocalState('react-project-access') }); }
function teamController() { return createTeamActionController({ repository: repositories().users, reload: invalidateWorkspace }); }
function chatController() { return createChatActionController({ state: state(), repository: repositories().chat, bucket: CHAT_BUCKET, currentUserId, renderChat: () => refreshLocalState('react-chat-render') }); }
function deleteController() { return createDeleteActionController({ repository: repositories().delete, reload: invalidateWorkspace, confirmDelete: (text) => (typeof confirm === 'function' ? confirm(text) : true) }); }

export function createWorkspaceReactActions() {
  const ui = useWorkspaceUiStore.getState();
  return {
    setView(view) { ui.setActiveView(view); return navigateWorkspaceRoute(view); },
    refresh() { return invalidateWorkspace(); },
    openProject(id = null) { return ui.openProject(id || '__new__'); },
    openTask(id = null) { return id ? ui.openTask(id) : ui.openTaskDraft({}); },
    openTaskOnDate(date, projectId = null) { return ui.openTaskDraft({ start_date: date, due_date: date, project_id: projectId || '' }); },
    createTaskForProject(projectId) { return ui.openTaskDraft({ project_id: projectId || '' }); },
    openUser(id = null) { return ui.openUser(id); },
    openAccess(projectId = null) { return ui.openAccess(projectId); },

    saveProjectData(id, row) { return guarded(() => projectController().saveProject(id === '__new__' ? null : id || null, row)); },
    saveUserData(id, row) { return guarded(() => teamController().saveUser(id || null, row)); },
    saveAccessData(row) { return guarded(() => projectController().saveAccess(row)); },
    saveTaskData(id, row) { return guarded(() => taskController().saveTask(row, { id: id || null })); },

    deleteProject(id) { return guarded(() => deleteController().softDelete('projects', id)); },
    deleteTask(id) { return guarded(() => deleteController().softDelete('tasks', id)); },
    deactivateUser(id) { return guarded(() => teamController().deactivateUser(id)); },
    removeAccess(id) { return guarded(() => projectController().removeAccess(id)); },

    toggleTask(id, done) { return guarded(() => taskController().toggleTask(id, done)); },
    moveTask(id, status) { return guarded(() => taskController().moveTask(id, status)); },
    updateTaskTimeline(id, startDate, dueDate) { return guarded(() => taskController().updateTaskTimeline(id, startDate, dueDate)); },
    toggleTaskFavorite(id) { return guarded(() => taskController().toggleFavorite(id)); },
    addSubtask(taskId, title) { return guarded(() => taskController().addSubtask(taskId, title)); },
    toggleSubtask(id, done) { return guarded(() => taskController().toggleSubtask(id, done)); },
    deleteSubtask(id) { return guarded(() => taskController().deleteSubtask(id)); },

    deleteChatMessage(id) { return guarded(() => chatController().deleteMessage(id)); }
  };
}
