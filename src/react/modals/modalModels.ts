// @ts-nocheck

export const PROJECT_STATUS_OPTIONS = Object.freeze([
  { value: 'idea', label: 'Идея' },
  { value: 'planned', label: 'Запланировано' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'waiting', label: 'Ожидание' },
  { value: 'done', label: 'Завершено' }
]);

export const PROJECT_PRIORITY_OPTIONS = Object.freeze([
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' }
]);

export const USER_ROLE_OPTIONS = Object.freeze([
  { value: 'owner', label: 'owner' },
  { value: 'admin', label: 'admin' },
  { value: 'member', label: 'member' },
  { value: 'viewer', label: 'viewer' }
]);

export const ACCESS_ROLE_OPTIONS = Object.freeze([
  { value: 'viewer', label: 'viewer — просмотр' },
  { value: 'editor', label: 'editor — задачи и вехи' },
  { value: 'owner', label: 'owner — управление доступом' }
]);

/** @param {unknown} value */
function stringValue(value) {
  return value == null ? '' : String(value);
}

/**
 * @param {Partial<import('../../types/entities').Project> | null | undefined} project
 * @param {{ defaultOwnerId?: string | null }} [options]
 */
export function createProjectModalForm(project, options = {}) {
  return {
    id: stringValue(project?.id),
    name: stringValue(project?.name),
    owner_id: stringValue(project?.owner_id || options.defaultOwnerId || ''),
    status: stringValue(project?.status || 'planned'),
    priority: stringValue(project?.priority || 'medium'),
    start_date: stringValue(project?.start_date),
    deadline: stringValue(project?.deadline),
    color: stringValue(project?.color || '#111827'),
    next_step: stringValue(project?.next_step),
    description: stringValue(project?.description)
  };
}

/** @param {ReturnType<typeof createProjectModalForm>} form */
export function projectFormToSaveInput(form) {
  return {
    name: form.name.trim(),
    owner_id: form.owner_id || null,
    status: form.status || 'planned',
    priority: form.priority || 'medium',
    start_date: form.start_date || null,
    deadline: form.deadline || null,
    color: form.color || '#111827',
    next_step: form.next_step || null,
    description: form.description || null
  };
}

/**
 * @param {Partial<import('../../types/entities').AppUser> | null | undefined} user
 */
export function createUserModalForm(user) {
  return {
    id: stringValue(user?.id),
    display_name: stringValue(user?.display_name),
    email: stringValue(user?.email),
    role: stringValue(user?.role || 'member'),
    position: stringValue(user?.position)
  };
}

/** @param {ReturnType<typeof createUserModalForm>} form */
export function userFormToSaveInput(form) {
  return {
    display_name: form.display_name.trim(),
    email: form.email.trim() || null,
    role: form.role || 'member',
    position: form.position || null,
    is_active: true
  };
}

/**
 * @param {Partial<import('../../types/entities').Project> | null | undefined} project
 * @param {import('../../types/entities').ProjectMember[]} members
 */
export function createAccessModalForm(project, members = []) {
  return {
    project_id: stringValue(project?.id),
    project_name: stringValue(project?.name || 'Проект'),
    user_id: '',
    access_role: 'viewer',
    members: members.filter((member) => member.project_id === project?.id)
  };
}

/** @param {ReturnType<typeof createAccessModalForm>} form */
export function accessFormToSaveInput(form) {
  return {
    project_id: form.project_id,
    user_id: form.user_id,
    access_role: form.access_role
  };
}

/**
 * @param {import('../../types/entities').AppUser[]} users
 */
export function createUserOptions(users = []) {
  return users
    .filter((user) => user && user.id && user.is_active !== false)
    .map((user) => ({ value: user.id, label: user.display_name || user.email || 'Пользователь' }));
}

/**
 * @param {string | undefined | null} id
 * @param {import('../../types/entities').AppUser[]} users
 */
export function userName(id, users = []) {
  const user = users.find((item) => item.id === id);
  return user?.display_name || user?.email || '—';
}
