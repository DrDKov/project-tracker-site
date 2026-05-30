import assert from 'node:assert/strict';
import {
  createChatMessageViewModel,
  createChatProjectOptions,
  createChatViewModel,
  getActiveChatProjectId,
  getAuthorLabel,
  parseChatBody
} from '../../src/react/chat/chatModel.ts';

const projects = [
  { id: 'p1', name: 'Салым' },
  { id: 'p2', name: 'Капотня' }
];
const users = [
  { id: 'u1', display_name: 'Дмитрий' },
  { id: 'u2', email: 'maria@example.com' }
];
const messages = [
  { id: 'm1', project_id: 'p1', author_id: 'u1', body: 'Привет\n\n📎 protocol.pdf: https://example.com/protocol.pdf', created_at: '2026-06-01T10:00:00Z' },
  { id: 'm2', project_id: 'p1', author_id: 'u2', body: 'Фото\n🖼 image.png: https://example.com/image.png', created_at: '2026-06-01T11:00:00Z' },
  { id: 'm3', project_id: 'p2', author_id: 'u1', body: 'Другой проект', created_at: '2026-06-01T12:00:00Z' },
  { id: 'm4', project_id: 'p1', author_id: 'u1', body: 'Удалено', deleted_at: '2026-06-01T13:00:00Z' }
];
const dt = (value) => value ? value.slice(11, 16) : '';

const parsed = parseChatBody(messages[0].body);
assert.deepEqual(parsed.textLines, ['Привет']);
assert.equal(parsed.attachments.length, 1);
assert.equal(parsed.attachments[0].isImage, false);

const parsedImage = parseChatBody(messages[1].body);
assert.equal(parsedImage.attachments[0].isImage, true);

assert.equal(getAuthorLabel('u1', users, null), 'Дмитрий');
assert.equal(getAuthorLabel('u2', users, null), 'maria@example.com');
assert.equal(getAuthorLabel('unknown', users, null), 'Пользователь');

assert.equal(getActiveChatProjectId(projects, 'p2'), 'p2');
assert.equal(getActiveChatProjectId(projects, 'missing'), 'p1');
assert.equal(getActiveChatProjectId([], 'missing'), '');

const projectOptions = createChatProjectOptions(projects, 'p2');
assert.equal(projectOptions.length, 2);
assert.equal(projectOptions[1].selected, true);

const messageVm = createChatMessageViewModel(messages[0], { users, profile: users[0], dateTime: dt });
assert.equal(messageVm.mine, true);
assert.equal(messageVm.authorLabel, 'Дмитрий');
assert.equal(messageVm.createdLabel, '10:00');
assert.equal(messageVm.attachments[0].name, 'protocol.pdf');

const model = createChatViewModel({ projects, messages, users, profile: users[0], activeProjectId: 'p1', search: '', selectedFileCount: 2, dateTime: dt });
assert.equal(model.activeProjectId, 'p1');
assert.equal(model.projectOptions.length, 2);
assert.equal(model.messages.length, 2, 'only active project non-deleted messages are shown');
assert.equal(model.selectedFileCount, 2);
assert.equal(model.messages[0].mine, true);
assert.equal(model.messages[1].mine, false);

const filtered = createChatViewModel({ projects, messages, users, profile: users[0], activeProjectId: 'p1', search: 'фото', dateTime: dt });
assert.equal(filtered.messages.length, 1);
assert.equal(filtered.messages[0].id, 'm2');

console.log('chat model tests passed');
