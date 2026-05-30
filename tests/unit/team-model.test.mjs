import assert from 'node:assert/strict';
import {
  createTeamPageViewModel,
  createUserCardViewModel,
  normalizeRole,
  roleLabel,
  userDisplayName,
  userInitials,
  userProjectAccess
} from '../../src/react/team/teamModel.ts';

const users = [
  { id: 'u2', display_name: 'Мария Иванова', email: 'maria@example.com', role: 'admin', is_active: true, position: 'Координатор' },
  { id: 'u1', display_name: 'Дмитрий Коваленко', email: 'owner@example.com', role: 'owner', is_active: true },
  { id: 'u3', email: 'doctor@example.com', role: 'member', is_active: false }
];

const projects = [
  { id: 'p1', name: 'Салым', owner_id: 'u1' },
  { id: 'p2', name: 'Капотня', owner_id: 'u2' },
  { id: 'p3', name: 'Архив', owner_id: 'u1', deleted_at: '2026-06-10' }
];

const members = [
  { id: 'm1', project_id: 'p1', user_id: 'u2', access_role: 'editor' },
  { id: 'm2', project_id: 'p2', user_id: 'u3', access_role: 'viewer' },
  { id: 'm3', project_id: 'p3', user_id: 'u3', access_role: 'viewer' }
];

assert.equal(normalizeRole(' OWNER '), 'owner');
assert.equal(normalizeRole(''), 'member');
assert.equal(roleLabel('admin'), 'Администратор');
assert.equal(roleLabel('custom'), 'custom');
assert.equal(userDisplayName(users[2]), 'doctor@example.com');
assert.equal(userInitials(users[0]), 'МИ');
assert.equal(userInitials(users[2]), 'DO');

const ownerAccess = userProjectAccess(projects, members, 'u1');
assert.equal(ownerAccess.length, 1);
assert.equal(ownerAccess[0].name, 'Салым');
assert.equal(ownerAccess[0].owned, true);

const adminAccess = userProjectAccess(projects, members, 'u2');
assert.equal(adminAccess.length, 2);
assert.deepEqual(adminAccess.map((item) => item.name), ['Капотня', 'Салым']);
assert.equal(adminAccess[0].owned, true);
assert.equal(adminAccess[1].role, 'editor');

const card = createUserCardViewModel(users[0], {
  users,
  projects,
  members,
  currentProfile: users[0],
  canManageUsers: true,
  canEditUser: () => true,
  canDeactivateUser: (user) => user.id !== 'u2'
});
assert.equal(card.displayName, 'Мария Иванова');
assert.equal(card.roleLabel, 'Администратор');
assert.equal(card.currentUser, true);
assert.equal(card.canEdit, true);
assert.equal(card.canDeactivate, false);
assert.equal(card.ownedProjectsCount, 1);
assert.equal(card.memberProjectsCount, 1);
assert.equal(card.totalProjectsCount, 2);

const page = createTeamPageViewModel({
  users,
  projects,
  members,
  currentProfile: users[1],
  canManageUsers: true,
  canEditUser: () => true,
  canDeactivateUser: () => true
});
assert.equal(page.total, 3);
assert.equal(page.active, 2);
assert.equal(page.inactive, 1);
assert.equal(page.owners, 1);
assert.equal(page.admins, 1);
assert.deepEqual(page.users.map((user) => user.role), ['owner', 'admin', 'member']);

console.log('team model tests passed');
