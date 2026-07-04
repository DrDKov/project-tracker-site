export type WorkspaceRouteId =
  | 'overview'
  | 'projects'
  | 'tasks'
  | 'timeline'
  | 'chat'
  | 'team'
  | 'materials'
  | 'audit'
  | 'settings';

export interface WorkspaceRouteDefinition {
  id: WorkspaceRouteId;
  path: string;
  icon: string;
  label: string;
  subtitle: string;
  elementId: string;
  requires?: 'materials' | 'audit';
}

export const WORKSPACE_ROUTES: readonly WorkspaceRouteDefinition[] = Object.freeze([
  { id: 'overview', path: '/', icon: '⌂', label: 'Обзор', subtitle: 'Единое пространство управления проектами', elementId: 'overview' },
  { id: 'projects', path: '/projects', icon: '▦', label: 'Проекты', subtitle: 'Проекты, владельцы, сроки и прогресс', elementId: 'projects' },
  { id: 'tasks', path: '/tasks', icon: '☑', label: 'Задачи', subtitle: 'Канбан, исполнители, сроки и фокус недели', elementId: 'tasks' },
  { id: 'timeline', path: '/timeline', icon: '⌁', label: 'Таймлайн', subtitle: 'Календарная шкала задач и проектных сроков', elementId: 'timeline' },
  { id: 'chat', path: '/chat', icon: '✎', label: 'Чаты', subtitle: 'Проектные обсуждения, файлы и изображения', elementId: 'chat' },
  { id: 'team', path: '/team', icon: '◉', label: 'Команда', subtitle: 'Пользователи, роли и доступы', elementId: 'team' },
  { id: 'materials', path: '/materials', icon: '▤', label: 'Материалы', subtitle: 'Шаблоны и документы только для владельца', elementId: 'materials', requires: 'materials' },
  { id: 'audit', path: '/audit', icon: '◷', label: 'Журнал', subtitle: 'Журнал изменений workspace', elementId: 'audit', requires: 'audit' },
  { id: 'settings', path: '/settings', icon: '⚙', label: 'Настройки', subtitle: 'Подключение, авторизация и параметры workspace', elementId: 'settings' }
]);

export const DEFAULT_WORKSPACE_ROUTE = WORKSPACE_ROUTES[0];

const ROUTES_BY_ID = new Map<WorkspaceRouteId, WorkspaceRouteDefinition>(WORKSPACE_ROUTES.map((route) => [route.id, route]));
const ROUTES_BY_PATH = new Map<string, WorkspaceRouteDefinition>(WORKSPACE_ROUTES.map((route) => [route.path, route]));

export function normalizeWorkspacePath(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw || raw === '#') return '/';
  const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw;
  const withoutQuery = withoutHash.split('?')[0].split('#')[0];
  const withSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return withSlash === '/overview' ? '/' : withSlash.replace(/\/+$/, '') || '/';
}

export function resolveWorkspaceRoute(value?: string | null): WorkspaceRouteDefinition {
  const path = normalizeWorkspacePath(value || (typeof window !== 'undefined' ? window.location.hash : ''));
  return ROUTES_BY_PATH.get(path) || DEFAULT_WORKSPACE_ROUTE;
}

export function getWorkspaceRouteById(id: string | null | undefined): WorkspaceRouteDefinition {
  return ROUTES_BY_ID.get(id as WorkspaceRouteId) || DEFAULT_WORKSPACE_ROUTE;
}

export function getWorkspaceRoutePath(id: string | null | undefined): string {
  return getWorkspaceRouteById(id).path;
}

export function getWorkspaceRouteHash(id: string | null | undefined): string {
  return `#${getWorkspaceRoutePath(id)}`;
}

export function isWorkspaceRouteId(value: string | null | undefined): value is WorkspaceRouteId {
  return ROUTES_BY_ID.has(value as WorkspaceRouteId);
}

export function routeIdFromHash(hash: string | null | undefined): WorkspaceRouteId {
  return resolveWorkspaceRoute(hash).id;
}

export function routeIdFromPathname(pathname: string | null | undefined): WorkspaceRouteId {
  return resolveWorkspaceRoute(pathname).id;
}
