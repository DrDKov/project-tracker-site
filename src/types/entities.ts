export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer' | 'editor' | string;
export type TaskStatus = 'idea' | 'planned' | 'in_progress' | 'waiting' | 'done' | 'blocked' | 'todo' | 'doing' | string;
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | string;

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AppUser {
  id: string;
  display_name?: string;
  email?: string;
  role?: WorkspaceRole;
  is_active?: boolean;
  position?: string;
  auth_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  workspace_id?: string;
  name?: string;
  description?: string | null;
  owner_id?: string | null;
  color?: string | null;
  status?: string;
  priority?: string;
  start_date?: string | null;
  deadline?: string | null;
  next_step?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProjectMember {
  id?: string;
  project_id: string;
  user_id: string;
  access_role?: WorkspaceRole;
  created_at?: string;
}

export interface Task {
  id: string;
  project_id?: string | null;
  title?: string;
  description?: string | null;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  assignee_ids?: string[];
  start_date?: string | null;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  is_all_day?: boolean;
  recurrence_date?: string | null;
  sort_order?: number;
  is_favorite?: boolean;
  recurrence_rule_id?: string | null;
  completed_at?: string | null;
  completed_by_id?: string | null;
  completed_by?: string | null;
  closed_by_id?: string | null;
  updated_by?: string | null;
  updated_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface TaskAssignee {
  id?: string;
  task_id: string;
  user_id: string;
  created_at?: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title?: string;
  is_done?: boolean;
  sort_order?: number;
  created_at?: string;
  deleted_at?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id?: string;
  author_id?: string;
  body?: string;
  content?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id?: string;
  author_id?: string;
  body?: string;
  content?: string;
  files?: Array<{ name: string; url: string; type?: string; isImage?: boolean }>;
  created_at?: string;
  deleted_at?: string | null;
}

export interface NotificationRecord {
  id?: string;
  type?: string;
  task_id?: string;
  user_id?: string;
  title?: string;
  body?: string;
  project?: string;
  project_id?: string | null;
  author?: string;
  unread?: boolean;
  is_read?: boolean;
  created_at?: string;
}

export interface WorkspacePermissionSnapshot {
  profileId: string | null;
  role: string;
  isOwner: boolean;
  isAdmin: boolean;
  canManageWorkspace: boolean;
  canManageUsers: boolean;
  canViewAudit: boolean;
  canViewMaterials: boolean;
  projectIds: string[];
}

export interface MaterialTemplate {
  id: string;
  title?: string;
  name?: string;
  body?: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MaterialFolder {
  id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MaterialFile {
  id: string;
  folder_id?: string | null;
  name?: string;
  original_name?: string;
  storage_path?: string;
  size?: number;
  mime_type?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export interface AppState {
  user?: AuthUser | null;
  profile?: AppUser | null;
  sb?: any;
  view?: string;
  projects?: Project[];
  tasks?: Task[];
  users?: AppUser[];
  members?: ProjectMember[];
  assignees?: TaskAssignee[];
  subtasks?: Subtask[];
  taskComments?: TaskComment[];
  messages?: ProjectMessage[];
  notifications?: NotificationRecord[];
  permissions?: WorkspacePermissionSnapshot | null;
  materialTemplates?: MaterialTemplate[];
  materialFolders?: MaterialFolder[];
  materialFiles?: MaterialFile[];
  logs?: Array<Record<string, any>>;
  audit?: any[];
  renderTimer?: number;
  renderReason?: string;
  selectSignature?: string;
  taskBoardMode?: string;
  tasksShowDone?: boolean;
  tasksWeekStart?: string;
  tasksDateMode?: string;
  tasksDateFrom?: string;
  tasksDateTo?: string;
  taskBoardDndReactStage5?: boolean;
  dragTask?: string | null;
  loading?: boolean;
  tasksLoading?: boolean;
  warnings?: string[];
  taskError?: string;
  statusTitle?: string;
  statusText?: string;
  activeChat?: string | null;
  [key: string]: any;
}

export interface WorkspaceStoreEvent {
  state: AppState;
  version?: number;
  meta?: Record<string, unknown>;
}

export interface WorkspaceStoreLike {
  getState: () => AppState;
  getSnapshot?: () => AppState;
  subscribe: (listener: (event?: WorkspaceStoreEvent) => void) => () => void;
  setState?: (patch: Partial<AppState>, meta?: Record<string, unknown>) => AppState;
  replaceState?: (nextState: AppState, meta?: Record<string, unknown>) => AppState;
}
