export const workspaceQueryKeys = {
  all: ['workspace'] as const,
  bootstrap: () => [...workspaceQueryKeys.all, 'bootstrap'] as const,
  projects: () => [...workspaceQueryKeys.all, 'projects'] as const,
  tasks: () => [...workspaceQueryKeys.all, 'tasks'] as const,
  users: () => [...workspaceQueryKeys.all, 'users'] as const,
  members: () => [...workspaceQueryKeys.all, 'members'] as const,
  materials: () => [...workspaceQueryKeys.all, 'materials'] as const,
  notifications: () => [...workspaceQueryKeys.all, 'notifications'] as const,
  chat: (projectId?: string | null) => [...workspaceQueryKeys.all, 'chat', projectId || 'all'] as const
};
