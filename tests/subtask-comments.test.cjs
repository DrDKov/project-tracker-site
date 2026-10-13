const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const threadUi = fs.readFileSync(path.join(root, 'assets', 'task-comment-threads.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260928_task_comment_subtasks.sql'), 'utf8');
const names = ['subBlock', 'taskCommentList', 'taskCommentCount', 'commentAuthor', 'canDeleteComment', 'canEditComment', 'commentSubtask', 'renderTaskCommentsModal', 'addTaskComment', 'saveTaskCommentEdit'];
const indexHelpers = runtime.slice(runtime.indexOf('let RENDER_DATA_INDEXES='),runtime.indexOf('function byId('));
const source = indexHelpers+'\n'+names.map(name => {
  if(name === 'renderTaskCommentsModal') return runtime.slice(runtime.indexOf('function renderTaskCommentsModal(){'),runtime.indexOf('function goToNewTaskComment(',runtime.indexOf('function renderTaskCommentsModal(){')));
  if(name === 'addTaskComment') return runtime.slice(runtime.indexOf('async function addTaskComment(){'),runtime.indexOf('async function saveTaskCommentEdit(',runtime.indexOf('async function addTaskComment(){')));
  const line = runtime.split(/\r?\n/).find(row => row.startsWith(`function ${name}(`) || row.startsWith(`async function ${name}(`));
  assert.ok(line, `${name} must be present`);
  return line;
}).join('\n');

assert.match(migration, /foreign key \(subtask_id\) references public\.task_subtasks\(id\)/);
assert.match(migration, /s\.task_id = new\.task_id/);
assert.match(migration, /drop policy if exists task_comments_soft_delete_visible_task/);

const taskId = 'task-1';
const subtaskId = 'subtask-1';
const authorId = 'author-1';
const input = { value: 'Готово к проверке', disabled: false };
const send = { disabled: false };
const editor = { value: 'Исправленный текст' };
const save = { disabled: false, isConnected: true };
const box = { innerHTML: '', querySelector: () => null };
const count = { textContent: '' };
let inserted, updated, filters = [], insertSeq = 0, failNextInsert = false, renderedContext = 'initial';
const S = {
  profile: { id: authorId, display_name: 'Автор', role: 'member' },
  users: [{ id: authorId, display_name: 'Автор' }],
  subtasks: [{ id: subtaskId, task_id: taskId, title: '<Подзадача>', deleted_at: null }],
  taskComments: [],
  commentSubtaskId: subtaskId,
};
const elements = { taskId: { value: taskId }, taskCommentText: input, taskCommentsList: box, taskCommentsCount: count };
const client = {
  from(table) {
    assert.equal(table, 'task_comments');
    return {
      insert(row) {
        inserted = row;
        return { select: () => ({ single: async () => {
          if(failNextInsert){ failNextInsert = false; return {data:null,error:new Error('Temporary storage failure')}; }
          return { data: { ...row, id: 'comment-'+(++insertSeq), created_at: '2026-09-28T12:00:00Z' }, error: null };
        } }) };
      },
      update(row) {
        updated = row;
        return {
          eq(column, value) { filters.push([column, value]); return this; },
          is(column, value) { filters.push([column, value]); return this; },
          select() { return this; },
          async maybeSingle() { return { data: { ...S.taskComments[0], ...row }, error: null }; },
        };
      },
    };
  },
};
S.sb = client;
const context = vm.createContext({
  S,
  syncStableContent(element,html){element.innerHTML=html},
  $: id => elements[id],
  document: { querySelector(selector) {
    if (selector.includes('add-task-comment')) return send;
    if (selector.includes('task-comment-edit-text')) return editor;
    if (selector.includes('save-task-comment-edit')) return save;
    return null;
  } },
  esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  dt: value => String(value),
  subs: id => S.subtasks.filter(sub => sub.task_id === id),
  subtaskState: () => 'not_done',
  subtaskToggleLabel: () => 'Не выполнено',
  pcolor: () => '#075d65',
  renderCommentSubtaskContext: () => {renderedContext = S.commentSubtaskId;},
  renderReplyComposerContext: () => {},
  goToNewTaskComment: () => {},
  window: {},
  loadTaskComments: () => Promise.resolve(true),
  workspaceHistoryState: () => ({loaded:true}),
  historyNotice: () => '',
  scheduleRender: () => {},
  rtUpsert: (table, row) => {
    assert.equal(table, 'task_comments');
    const index = S.taskComments.findIndex(comment => comment.id === row.id);
    if (index < 0) S.taskComments.push(row);
    else S.taskComments[index] = row;
  },
});
vm.runInContext(threadUi, context);
vm.runInContext(source, context);

(async () => {
  const card = vm.runInContext('subBlock({id:"task-1",project_id:"project-1"})', context);
  assert.match(card, /data-action="comment-subtask"/);
  assert.match(card, /aria-label="Комментировать подзадачу &lt;Подзадача&gt;"/);

  await vm.runInContext('addTaskComment()', context);
  assert.equal(inserted.task_id, taskId);
  assert.equal(inserted.subtask_id, subtaskId);
  assert.equal(inserted.body, 'Готово к проверке');
  assert.equal(input.value, '');
  assert.equal(send.disabled, false);
  assert.equal(S.commentSubtaskId, null, 'successful send must clear @ subtask selection');
  assert.equal(renderedContext, null, 'context UI must rerender without the old @ chip');

  vm.runInContext('renderTaskCommentsModal()', context);
  assert.match(box.innerHTML, /@&lt;Подзадача&gt;/);
  assert.match(box.innerHTML, /data-action="edit-task-comment"/);
  assert.match(box.innerHTML, /data-action="edit-task-comment"[^>]*aria-label="Редактировать комментарий"[^>]*title="Редактировать комментарий"><svg/);
  assert.match(box.innerHTML, /data-action="delete-task-comment"[^>]*aria-label="Удалить комментарий"[^>]*title="Удалить комментарий"><svg/);
  assert.match(box.innerHTML, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.doesNotMatch(box.innerHTML, />Редактировать<\/button>|>Удалить<\/button>/, 'header actions must be compact icons, not words');
  assert.equal(count.textContent, '1');

  input.value = 'Отдельное сообщение без ссылки';
  await vm.runInContext('addTaskComment()', context);
  assert.equal(inserted.subtask_id, null, 'next comment must not inherit prior @ subtask');
  assert.equal(S.taskComments.length, 2);
  assert.equal(input.value, '');

  S.commentSubtaskId = subtaskId;
  input.value = 'Сообщение не было отправлено';
  failNextInsert = true;
  await assert.rejects(vm.runInContext('addTaskComment()', context), /Temporary storage failure/);
  assert.equal(S.commentSubtaskId, subtaskId, 'failed send must keep the @ reference for retry');
  assert.equal(input.value, 'Сообщение не было отправлено', 'failed send must keep the draft');
  assert.equal(send.disabled, false);
  await vm.runInContext('addTaskComment()', context);
  assert.equal(inserted.subtask_id, subtaskId, 'retry must preserve its intended link');
  assert.equal(S.commentSubtaskId, null, 'successful retry clears @ selection');
  assert.equal(input.value, '');

  // A reply attaches to the selected message, inherits its root/subtask, and resets.
  S.commentReplyToId = 'comment-1';
  input.value = 'Ответ на первоначальный комментарий';
  await vm.runInContext('addTaskComment()', context);
  assert.equal(inserted.reply_to_comment_id, 'comment-1');
  assert.equal(inserted.thread_root_id, 'comment-1');
  assert.equal(inserted.subtask_id, subtaskId);
  assert.equal(S.commentReplyToId, null, 'reply context clears on success');
  assert.equal(input.value, '');
  const firstReplyId = S.taskComments.at(-1).id;

  // Reply-to-reply stays in one root thread and points to the exact quoted reply.
  S.commentReplyToId = firstReplyId;
  input.value = 'Ответ на ответ';
  failNextInsert = true;
  await assert.rejects(vm.runInContext('addTaskComment()', context), /Temporary storage failure/);
  assert.equal(S.commentReplyToId, firstReplyId, 'failed reply preserves exact message target');
  assert.equal(input.value, 'Ответ на ответ', 'failed reply keeps draft');
  await vm.runInContext('addTaskComment()', context);
  assert.equal(inserted.reply_to_comment_id, firstReplyId);
  assert.equal(inserted.thread_root_id, 'comment-1');
  assert.equal(inserted.subtask_id, subtaskId);
  assert.equal(S.commentReplyToId, null);
  assert.equal(input.value, '');

  S.taskComments[0].body = 'Старый текст';
  await vm.runInContext('saveTaskCommentEdit("comment-1")', context);
  assert.equal(updated.body, 'Исправленный текст');
  assert.ok(updated.updated_at);
  assert.deepEqual(filters, [['id', 'comment-1'], ['task_id', taskId], ['user_id', authorId], ['deleted_at', null]]);
  assert.equal(S.taskComments[0].body, 'Исправленный текст');
  assert.equal(save.disabled, false);

  S.profile.id = 'someone-else';
  vm.runInContext('renderTaskCommentsModal()', context);
  assert.doesNotMatch(box.innerHTML, /data-action="edit-task-comment"/);
  console.log('Subtask comments and author editing checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
