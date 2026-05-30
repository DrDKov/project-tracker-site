// @ts-check
const WORKSPACE_OWNER_ROLES = new Set(['owner']);
const WORKSPACE_ADMIN_ROLES = new Set(['owner', 'admin']);
const PROJECT_WRITE_ROLES = new Set(['owner', 'editor']);
const PROJECT_OWNER_ROLES = new Set(['owner']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().trim();
}

function isActiveUser(user) {
  return !!(user && user.id && user.is_active !== false);
}

export function isWorkspaceOwner(profile) {
  return !!(isActiveUser(profile) && WORKSPACE_OWNER_ROLES.has(normalizeRole(profile.role)));
}

export function isWorkspaceAdmin(profile) {
  return !!(isActiveUser(profile) && WORKSPACE_ADMIN_ROLES.has(normalizeRole(profile.role)));
}

export function canManageWorkspace(profile) {
  return isWorkspaceAdmin(profile);
}

export function canViewAudit(profile) {
  return isWorkspaceOwner(profile);
}

export function canManageUsers(profile) {
  return isWorkspaceAdmin(profile);
}

export function canEditUser(profile, targetUser) {
  if (!profile || !targetUser) return false;
  if (isWorkspaceOwner(profile)) return true;
  if (normalizeRole(profile.role) === 'admin') return normalizeRole(targetUser.role) !== 'owner';
  return profile.id === targetUser.id;
}

export function canDeactivateUser(profile, targetUser) {
  if (!profile || !targetUser || profile.id === targetUser.id) return false;
  if (isWorkspaceOwner(profile)) return normalizeRole(targetUser.role) !== 'owner';
  if (normalizeRole(profile.role) === 'admin') return !WORKSPACE_ADMIN_ROLES.has(normalizeRole(targetUser.role));
  return false;
}

export function canViewMaterials(profile) {
  return isWorkspaceOwner(profile);
}

export function projectMemberRole(project, profile, members = []) {
  if (!project || !profile || !profile.id) return null;
  if (isWorkspaceAdmin(profile)) return 'workspace_admin';
  if (project.owner_id && project.owner_id === profile.id) return 'owner';
  const row = asArray(members).find((item) => item && item.project_id === project.id && item.user_id === profile.id);
  return row ? normalizeRole(row.access_role) || 'viewer' : null;
}

export function isProjectMember(project, profile, members = []) {
  return !!projectMemberRole(project, profile, members);
}

export function canViewProject(profile, project, members = []) {
  if (!profile || !project || project.deleted_at) return false;
  if (isWorkspaceAdmin(profile)) return true;
  return isProjectMember(project, profile, members);
}

export function canEditProject(profile, project, members = []) {
  if (!profile || !project || project.deleted_at) return false;
  if (isWorkspaceAdmin(profile)) return true;
  const role = projectMemberRole(project, profile, members);
  return PROJECT_WRITE_ROLES.has(role);
}

export function canDeleteProject(profile, project, members = []) {
  if (!profile || !project || project.deleted_at) return false;
  if (isWorkspaceAdmin(profile)) return true;
  const role = projectMemberRole(project, profile, members);
  return PROJECT_OWNER_ROLES.has(role);
}

export function canManageProjectAccess(profile, project, members = []) {
  return canDeleteProject(profile, project, members);
}

export function canViewTask(profile, task, projects = [], members = []) {
  if (!profile || !task || task.deleted_at) return false;
  const project = asArray(projects).find((item) => item && item.id === task.project_id);
  if (!project) return isWorkspaceAdmin(profile);
  return canViewProject(profile, project, members);
}

export function canEditTask(profile, task, projects = [], members = []) {
  if (!profile || !task || task.deleted_at) return false;
  const project = asArray(projects).find((item) => item && item.id === task.project_id);
  if (!project) return isWorkspaceAdmin(profile);
  if (canEditProject(profile, project, members)) return true;
  const assigneeIds = new Set([task.assignee_id, ...(asArray(task.assignee_ids))].filter(Boolean));
  return assigneeIds.has(profile.id);
}

export function canDeleteTask(profile, task, projects = [], members = []) {
  if (!profile || !task || task.deleted_at) return false;
  const project = asArray(projects).find((item) => item && item.id === task.project_id);
  if (!project) return isWorkspaceAdmin(profile);
  return canEditProject(profile, project, members);
}

export function canDeleteComment(profile, comment) {
  if (!profile || !comment) return false;
  return comment.user_id === profile.id || isWorkspaceAdmin(profile);
}

export function projectIdsForUser(userId, projects = [], members = []) {
  const result = new Set();
  if (!userId) return result;
  asArray(projects).forEach((project) => {
    if (project && !project.deleted_at && project.owner_id === userId) result.add(project.id);
  });
  asArray(members).forEach((member) => {
    if (member && member.user_id === userId && member.project_id) result.add(member.project_id);
  });
  return result;
}

export function haveSharedProject(leftUserId, rightUserId, projects = [], members = []) {
  if (!leftUserId || !rightUserId) return false;
  const left = projectIdsForUser(leftUserId, projects, members);
  if (!left.size) return false;
  const right = projectIdsForUser(rightUserId, projects, members);
  for (const id of left) if (right.has(id)) return true;
  return false;
}

export function canMentionUser(profile, targetUser, projects = [], members = []) {
  if (!profile || !targetUser || !profile.id || !targetUser.id) return false;
  if (profile.id === targetUser.id) return false;
  if (targetUser.is_active === false) return false;
  if (isWorkspaceOwner(profile)) return true;
  return haveSharedProject(profile.id, targetUser.id, projects, members);
}

export function allowedMentionUsers(profile, users = [], projects = [], members = []) {
  if (!profile || !profile.id) return [];
  return asArray(users).filter((user) => canMentionUser(profile, user, projects, members));
}

export function canUserMentionTarget(author, target, projects = [], members = []) {
  return canMentionUser(author, target, projects, members);
}

export function getWorkspacePermissionSnapshot(profile, projects = [], members = []) {
  return {
    profileId: profile && profile.id || null,
    role: normalizeRole(profile && profile.role),
    isOwner: isWorkspaceOwner(profile),
    isAdmin: isWorkspaceAdmin(profile),
    canManageWorkspace: canManageWorkspace(profile),
    canManageUsers: canManageUsers(profile),
    canViewAudit: canViewAudit(profile),
    canViewMaterials: canViewMaterials(profile),
    projectIds: Array.from(projectIdsForUser(profile && profile.id, projects, members))
  };
}
