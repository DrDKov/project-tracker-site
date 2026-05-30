import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type WorkspaceView = 'overview' | 'tasks' | 'projects' | 'timeline' | 'chat' | 'team' | 'materials' | 'audit' | 'settings' | string;

export interface WorkspaceModalState {
  taskId: string | null;
  projectId: string | null;
  userId: string | null;
  accessProjectId: string | null;
}

export interface WorkspaceFilterState {
  taskSearch: string;
  projectSearch: string;
  chatSearch: string;
  materialSearch: string;
}

export interface WorkspaceUiState {
  activeView: WorkspaceView;
  taskBoardMode: 'status' | 'assignee' | 'week';
  modals: WorkspaceModalState;
  filters: WorkspaceFilterState;
  setActiveView: (view: WorkspaceView) => void;
  setTaskBoardMode: (mode: WorkspaceUiState['taskBoardMode']) => void;
  openTask: (taskId?: string | null) => void;
  openProject: (projectId?: string | null) => void;
  openUser: (userId?: string | null) => void;
  openAccess: (projectId?: string | null) => void;
  closeModals: () => void;
  setFilter: <K extends keyof WorkspaceFilterState>(key: K, value: WorkspaceFilterState[K]) => void;
}

const initialModals: WorkspaceModalState = {
  taskId: null,
  projectId: null,
  userId: null,
  accessProjectId: null
};

const initialFilters: WorkspaceFilterState = {
  taskSearch: '',
  projectSearch: '',
  chatSearch: '',
  materialSearch: ''
};

export const useWorkspaceUiStore = create<WorkspaceUiState>()(
  subscribeWithSelector((set) => ({
    activeView: 'overview',
    taskBoardMode: 'status',
    modals: initialModals,
    filters: initialFilters,
    setActiveView: (activeView) => set({ activeView }),
    setTaskBoardMode: (taskBoardMode) => set({ taskBoardMode }),
    openTask: (taskId = null) => set((state) => ({ modals: { ...state.modals, taskId } })),
    openProject: (projectId = null) => set((state) => ({ modals: { ...state.modals, projectId } })),
    openUser: (userId = null) => set((state) => ({ modals: { ...state.modals, userId } })),
    openAccess: (accessProjectId = null) => set((state) => ({ modals: { ...state.modals, accessProjectId } })),
    closeModals: () => set({ modals: initialModals }),
    setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } }))
  }))
);

export function getWorkspaceUiSnapshot(): Pick<WorkspaceUiState, 'activeView' | 'taskBoardMode' | 'modals' | 'filters'> {
  const state = useWorkspaceUiStore.getState();
  return {
    activeView: state.activeView,
    taskBoardMode: state.taskBoardMode,
    modals: state.modals,
    filters: state.filters
  };
}
