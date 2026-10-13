const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const notifications=read('assets/assignment-notifications.js');
const polling=read('assets/notification-polling-rescue-lite.js');
const runtime=read('assets/app-runtime.js');
const edge=read('supabase/functions/send-assignment-push/index.ts');
const sql=read('supabase/migrations/20261013_recurring_comment_alerts.sql');
const html=read('index.html');
function extract(start,end){
 const i=notifications.indexOf(start),j=notifications.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,start+' boundaries');
 return notifications.slice(i,j);
}
const payload=[
 extract('function normalizeItems(items){','function applyReadBefore(){'),
 extract('function notificationTitle(item){','function renderUi(){'),
 extract('function pushItem(type,task,extra){','function pulseBell(){')
].join('\n');
const state={profileId:'user-1',items:[],unread:0,readBefore:'1970-01-01T00:00:00.000Z'};
let announcements=[];
const context=vm.createContext({
 MAX_ITEMS:40,state,Date,readTime:v=>Date.parse(v)||0,projectName:()=> 'Проект',
 saveStore:()=>{},ensureUi:()=>{},pulseBell:()=>{},
 showToast:item=>announcements.push(item),
});
vm.runInContext(payload,context);
function push(type,task,extra){context.pushItem(type,task,extra)}
const t1={id:'t1',title:'Задача 1',project_id:'p1',recurrence_rule_id:'series-1'};
const t2={id:'t2',title:'Задача 2',project_id:'p1',recurrence_rule_id:'series-1'};
push('assignment',t1,{notification_id:'a1'});
push('assignment',t2,{notification_id:'a2'});
assert.equal(state.items.length,1,'A 30-date recurring series must be one bell item');
assert.equal(announcements.length,1,'A series triggers one browser toast');
assert.equal(state.items[0].type,'recurrence');
push('assignment',{...t2,recurrence_rule_id:'series-2'},{notification_id:'a3'});
assert.equal(state.items.length,2,'Different recurring series each notify');
push('assignment',{id:'ordinary-1',title:'Task',project_id:'p1'},{notification_id:'a4'});
assert.equal(state.items.length,3,'Ordinary tasks remain individually notifiable');
const task={id:'t1',title:'Задача',project_id:'p1'};
push('mention',task,{comment_id:'c1'});
push('reply',task,{notification_id:'alert-1',comment_id:'c1'});
assert.equal(state.items.filter(x=>x.comment_id==='c1').length,1,'Reply and @ mention on the same comment must not duplicate');
assert.equal(state.items.find(x=>x.comment_id==='c1').type,'reply');
push('thread',task,{notification_id:'alert-2',comment_id:'c2'});
assert.equal(state.items.filter(x=>x.comment_id==='c2').length,1,'Thread message notifies once');
push('reply',task,{notification_id:'alert-2',comment_id:'c2'});
assert.equal(state.items.filter(x=>x.comment_id==='c2').length,2,'Different kinds are only deduped by actual alert identity'); // notifier receives one kind per server alert, never both
const grouped=context.normalizeItems(state.items);
assert.ok(grouped.some(x=>x.type==='thread'));
assert.equal(context.notificationTitle({type:'reply'}),'Ответили на ваш комментарий');
assert.equal(context.notificationTitle({type:'thread'}),'Новое сообщение в вашем обсуждении');
assert.match(sql,/unique\(recipient_id,comment_id\)/);
assert.match(sql,/c\.user_id<>new\.user_id/,'No alert to comment author');
assert.match(sql,/bool_or\(c\.id=new\.reply_to_comment_id\)/);
assert.match(sql,/c\.thread_root_id=new\.thread_root_id/,'Existing thread participants receive updates');
assert.match(sql,/task_comment_alerts_read/,'RLS restricts recipients');
assert.match(sql,/push_delivery_once_per_series_recipient/,'Atomic recurring push idempotency');
assert.match(edge,/recurrence_rule_id: task\?\.recurrence_rule_id \|\| null/);
assert.match(edge,/claimError\?\.code === "23505"/,'Parallel recurring assignments are deduplicated');
assert.match(notifications,/table:'task_comment_alerts'/);
assert.match(notifications,/preset:commentId\?\{tab:'comments',focus_comment_id:commentId\}/);
assert.match(runtime,/function focusNotificationComment\(/);
assert.match(runtime,/\.delete\(c\.thread_root_id\)/,'Focused replies expand their thread');
assert.match(runtime,/goToNewTaskComment\(commentId\)/);
assert.match(polling,/from\('task_comment_alerts'\)/);
assert.match(polling,/recurrence_rule_id/);
assert.match(html,/assignment-notifications\.js\?v=20261013-discussion-notifications-v1/);
assert.match(html,/notification-polling-rescue-lite\.js\?v=20261013-discussion-notifications-v1/);
console.log('Recurring series deduplication, thread recipients, comment deep links, RLS and polling checks passed');
