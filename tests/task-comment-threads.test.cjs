const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const script = fs.readFileSync(path.join(root,'assets/task-comment-threads.js'),'utf8');
const context = vm.createContext({window:{}});
vm.runInContext(script,context);
const api = context.window.ProjectTrackerCommentThreads;
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers = {esc,dt:()=>'09:30',author:id=>id,canEdit:c=>c.user_id==='me',canDelete:c=>c.user_id==='me',subtask:()=>null,editingId:null,editingDraft:null,selectedSubtaskId:null};
const rows = [
 {id:'root',task_id:'task',user_id:'me',body:'Первое <сообщение>',created_at:'2026-10-13T09:00:00Z',deleted_at:null},
 {id:'reply',task_id:'task',user_id:'you',body:'Ответ на исходное',reply_to_comment_id:'root',thread_root_id:'root',created_at:'2026-10-13T09:01:00Z',deleted_at:null},
 {id:'nested',task_id:'task',user_id:'me',body:'Ответ на ответ',reply_to_comment_id:'reply',thread_root_id:'root',created_at:'2026-10-13T09:02:00Z',deleted_at:null},
 {id:'other',task_id:'task',user_id:'me',body:'Другое обсуждение',created_at:'2026-10-13T09:03:00Z',deleted_at:null},
 {id:'foreign',task_id:'other-task',user_id:'me',body:'Не должно попасть сюда',created_at:'2026-10-13T09:04:00Z',deleted_at:null}
];
let html=api.render(rows,'task',new Set(),helpers);
assert.equal(api.structure(rows,'task').threads.length,2,'threads group roots, not each response');
assert.match(html,/data-thread-id="root"/);
assert.match(html,/data-thread-id="other"/);
assert.match(html,/2 ответа/);
assert.match(html,/Ответ you/,'reply to reply quotes the actual user');
assert.match(html,/Ответ на исходное/);
assert.match(html,/data-action="reply-task-comment" data-id="nested"/,'a reply can itself be quoted');
assert.match(html,/data-action="edit-task-comment" data-id="nested"/,'replies retain editing');
assert.match(html,/data-action="delete-task-comment" data-id="nested"/,'replies retain deletion');
assert.match(html,/Первое &lt;сообщение&gt;/,'HTML must be escaped');
assert.doesNotMatch(html,/Не должно попасть сюда/);
assert.equal((html.match(/class="task-thread-replies"/g)||[]).length,2,'at most one group container per root');

html=api.render(rows,'task',new Set(['root']),helpers);
assert.match(html,/aria-expanded="false"/);
assert.doesNotMatch(html,/data-comment-id="nested"/,'collapsed replies are hidden');
assert.match(html,/data-comment-id="other"/,'unrelated root remains visible');

rows[0].deleted_at='2026-10-13T10:00:00Z';
html=api.render(rows,'task',new Set(),helpers);
assert.match(html,/Комментарий удалён/);
assert.match(html,/data-comment-id="nested"/,'deleted parent cannot erase replies');
assert.doesNotMatch(html,/Первое &lt;сообщение&gt;/,'deleted parent body must be hidden');

rows[1].deleted_at='2026-10-13T10:01:00Z';
html=api.render(rows,'task',new Set(),helpers);
assert.match(html,/data-comment-id="reply"/,'deleted quoted reply remains as a tombstone while referenced');
assert.match(html,/data-comment-id="nested"/);
assert.doesNotMatch(html,/Ответ на исходное/,'quote content cannot expose a deleted reply');
console.log('Thread grouping, quote, collapse, edit/delete and deleted-parent tests passed');
