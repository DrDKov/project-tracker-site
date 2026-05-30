import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type WorkspaceView = 'overview' | 'tasks' | 'projects' | 'timeline' | 'chat' | 'team' | 'materials' | 'audit' | 'settings' | string;

export interface WorkspaceModalState {
  taskId: string | null;
  taskDraft: Record<string, any> | null;
  projectId: string | null;
  userId: string | null;
  accessProjectId: string | null;
}

export interface WorkspaceFilterState {
  taskSearch: string;
  taskProjectId: string;
  taskUserId: string;
  taskDateMode: 'all' | 'overdue' | 'exact' | 'from' | 'range';
  taskDateFrom: string;
  taskDateTo: string;
  tasksShowDone: boolean;
  projectSearch: string;
  projectStatus: string;
  projectOwnerId: string;
  timelineSearch: string;
  timelineProjectId: string;
  timelineUserId: string;
  timelineStatus: string;
  timelinePriority: string;
  timelineShowDone: boolean;
  chatSearch: string;
  materialSearch: string;
}

export interface WorkspaceUiState {
  activeView: WorkspaceView;
  taskBoardMode: 'status' | 'assignee' | 'week';
  tasksWeekStart: string;
  timelineDate: string;
  modals: WorkspaceModalState;
  filters: WorkspaceFilterState;
  setActiveView: (view: WorkspaceView) => void;
  setTaskBoardMode: (mode: WorkspaceUiState['taskBoardMode']) => void;
  setTasksWeekStart: (date: string) => void;
  setTimelineDate: (date: string) => void;
  openTask: (taskId?: string | null) => void;
  openTaskDraft: (draft?: Record<string, any> | null) => void;
  openProject: (projectId?: string | null) => void;
  openUser: (userId?: string | null) => void;
  openAccess: (projectId?: string | null) => void;
  closeModals: () => void;
  setFilter: <K extends keyof WorkspaceFilterState>(key: K, value: WorkspaceFilterState[K]) => void;
}

function localToday() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const initialModals: WorkspaceModalState = {
  taskId: null,
  taskDraft: null,
  projectId: null,
  userId: null,
  accessProjectId: null
};

const initialFilters: WorkspaceFilterState = {
  taskSearch: '',
  taskProjectId: 'all',
  taskUserId: 'all',
  taskDateMode: 'all',
  taskDateFrom: '',
  taskDateTo: '',
  tasksShowDone: true,
  projectSearch: '',
  projectStatus: 'all',
  projectOwnerId: 'all',
  timelineSearch: '',
  timelineProjectId: 'all',
  timelineUserId: 'all',
  timelineStatus: 'all',
  timelinePriority: 'all',
  timelineShowDone: false,
  chatSearch: '',
  materialSearch: ''
};

export const useWorkspaceUiStore = create<WorkspaceUiState>()(
  subscribeWithSelector((set) => ({
    activeView: 'overview',
    taskBoardMode: 'status',
    tasksWeekStart: localToday(),
    timelineDate: localToday(),
    modals: initialModals,
    filters: initialFilters,
    setActiveView: (activeView) => set({ activeView }),
    setTaskBoardMode: (taskBoardMode) => set({ taskBoardMode }),
    setTasksWeekStart: (tasksWeekStart) => set({ tasksWeekStart }),
    setTimelineDate: (timelineDate) => set({ timelineDate }),
    openTask: (taskId = null) => set((state) => ({ modals: { ...state.modals, taskId, taskDraft: null } })),
    openTaskDraft: (taskDraft = null) => set((state) => ({ modals: { ...state.modals, taskId: null, taskDraft: taskDraft || {} } })),
    openProject: (projectId = null) => set((state) => ({ modals: { ...state.modals, projectId } })),
    openUser: (userId = null) => set((state) => ({ modals: { ...state.modals, userId } })),
    openAccess: (accessProjectId = null) => set((state) => ({ modals: { ...state.modals, accessProjectId } })),
    closeModals: () => set({ modals: initialModals }),
    setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } }))
  }))
);

export function getWorkspaceUiSnapshot(): Pick<WorkspaceUiState, 'activeView' | 'taskBoardMode' | 'tasksWeekStart' | 'timelineDate' | 'modals' | 'filters'> {
  const state = useWorkspaceUiStore.getState();
  return {
    activeView: state.activeView,
    taskBoardMode: state.taskBoardMode,
    tasksWeekStart: state.tasksWeekStart,
    timelineDate: state.timelineDate,
    modals: state.modals,
    filters: state.filters
  };
}
