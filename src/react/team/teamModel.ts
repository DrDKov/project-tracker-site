// @ts-nocheck

/** @typedef {import('../../types/entities.js').AppUser} AppUser */
/** @typedef {import('../../types/entities.js').Project} Project */
/** @typedef {import('../../types/entities.js').ProjectMember} ProjectMember */

export const ROLE_LABELS = {
  owner: 'Владелец',
  admin: 'Администратор',
  member: 'Участник',
  editor: 'Редактор',
  viewer: 'Наблюдатель'
};

export const ROLE_ORDER = {
  owner: 0,
  admin: 1,
  member: 2,
  editor: 3,
  viewer: 4
};

/**
 * @typedef {Object} UserPermissionProjectModel
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} roleLabel
 * @property {boolean} owned
 */

/**
 * @typedef {Object} UserCardViewModel
 * @property {string} id
 * @property {string} displayName
 * @property {string} email
 * @property {string} initials
 * @property {string} role
 * @property {string} roleLabel
 * @property {string} position
 * @property {boolean} active
 * @property {boolean} currentUser
 * @property {boolean} canManage
 * @property {boolean} canEdit
 * @property {boolean} canDeactivate
 * @property {number} ownedProjectsCount
 * @property {number} memberProjectsCount
 * @property {number} totalProjectsCount
 * @property {string} projectSummary
 * @property {UserPermissionProjectModel[]} projects
 * @property {string} rootClassName
 */

/**
 * @typedef {Object} TeamPageViewModel
 * @property {UserCardViewModel[]} users
 * @property {number} total
 * @property {number} active
 * @property {number} inactive
 * @property {number} owners
 * @property {number} admins
 * @property {boolean} canManageUsers
 * @property {string} emptyLabel
 */

/**
 * @typedef {Object} TeamModelOptions
 * @property {AppUser[]} users
 * @property {Project[]} projects
 * @property {ProjectMember[]} members
 * @property {AppUser | null | undefined} currentProfile
 * @property {boolean} canManageUsers
 * @property {(user: AppUser) => boolean} canEditUser
 * @property {(user: AppUser) => boolean} canDeactivateUser
 */

/** @param {string | null | undefined} value */
export function normalizeRole(value) {
  return String(value || 'member').trim().toLowerCase() || 'member';
}

/** @param {string | null | undefined} role */
export function roleLabel(role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || role || 'Участник';
}

/** @param {AppUser} user */
export function userDisplayName(user) {
  return user.display_name || user.email || 'Пользователь';
}

/** @param {AppUser} user */
export function userInitials(user) {
  const source = userDisplayName(user).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const raw = parts.length > 1 ? `${parts[0][0] || ''}${parts[1][0] || ''}` : source.slice(0, 2);
  return raw.toUpperCase() || '??';
}

/**
 * @param {Project[]} projects
 * @param {ProjectMember[]} members
 * @param {string} userId
 * @returns {UserPermissionProjectModel[]}
 */
export function userProjectAccess(projects, members, userId) {
  const result = new Map();
  projects
    .filter((project) => !project.deleted_at)
    .forEach((project) => {
      if (project.owner_id === userId) {
        result.set(project.id, {
          id: project.id,
          name: project.name || 'Без названия',
          role: 'owner',
          roleLabel: 'Владелец проекта',
          owned: true
        });
      }
    });

  members
    .filter((member) => member.user_id === userId)
    .forEach((member) => {
      const project = projects.find((item) => item.id === member.project_id && !item.deleted_at);
      if (!project) return;
      if (result.has(project.id)) return;
      const role = normalizeRole(member.access_role || 'viewer');
      result.set(project.id, {
        id: project.id,
        name: project.name || 'Без названия',
        role,
        roleLabel: roleLabel(role),
        owned: false
      });
    });

  return Array.from(result.values()).sort((left, right) => {
    if (left.owned !== right.owned) return left.owned ? -1 : 1;
    return left.name.localeCompare(right.name, 'ru');
  });
}

/**
 * @param {AppUser} user
 * @param {TeamModelOptions} options
 * @returns {UserCardViewModel}
 */
export function createUserCardViewModel(user, options) {
  const role = normalizeRole(user.role);
  const projects = userProjectAccess(options.projects, options.members, user.id);
  const ownedProjectsCount = projects.filter((project) => project.owned).length;
  const memberProjectsCount = projects.filter((project) => !project.owned).length;
  const totalProjectsCount = projects.length;
  const active = user.is_active !== false;
  const currentUser = Boolean(options.currentProfile && options.currentProfile.id === user.id);

  return {
    id: user.id,
    displayName: userDisplayName(user),
    email: user.email || '',
    initials: userInitials(user),
    role,
    roleLabel: roleLabel(role),
    position: user.position || '',
    active,
    currentUser,
    canManage: Boolean(options.canManageUsers),
    canEdit: Boolean(options.canManageUsers && options.canEditUser(user)),
    canDeactivate: Boolean(options.canManageUsers && options.canDeactivateUser(user)),
    ownedProjectsCount,
    memberProjectsCount,
    totalProjectsCount,
    projectSummary: totalProjectsCount
      ? `Проектов: ${totalProjectsCount} · владелец: ${ownedProjectsCount} · участник: ${memberProjectsCount}`
      : 'Нет доступов к проектам',
    projects,
    rootClassName: `react-user-card ${active ? '' : 'inactive'} ${currentUser ? 'current' : ''}`.trim()
  };
}

/**
 * @param {TeamModelOptions} options
 * @returns {TeamPageViewModel}
 */
export function createTeamPageViewModel(options) {
  const users = (options.users || [])
    .slice()
    .sort((left, right) => {
      const leftRole = normalizeRole(left.role);
      const rightRole = normalizeRole(right.role);
      const roleDiff = (ROLE_ORDER[leftRole] ?? 50) - (ROLE_ORDER[rightRole] ?? 50);
      if (roleDiff) return roleDiff;
      return userDisplayName(left).localeCompare(userDisplayName(right), 'ru');
    })
    .map((user) => createUserCardViewModel(user, options));

  return {
    users,
    total: users.length,
    active: users.filter((user) => user.active).length,
    inactive: users.filter((user) => !user.active).length,
    owners: users.filter((user) => user.role === 'owner').length,
    admins: users.filter((user) => user.role === 'admin').length,
    canManageUsers: Boolean(options.canManageUsers),
    emptyLabel: 'Нет пользователей'
  };
}
