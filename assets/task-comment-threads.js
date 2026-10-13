/* Threaded replies for task comment inspector; presentation only, access rules remain in Supabase. */
(function(){
'use strict';
function threadStructure(rows,taskId){
 const usable=(rows||[]).filter(c=>c.task_id===taskId&&typeof c.body==='string').sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));
 const byId=new Map(usable.map(c=>[c.id,c])),roots=[],groups=new Map();
 for(const c of usable){if(c.reply_to_comment_id&&c.thread_root_id&&byId.has(c.thread_root_id)){const list=groups.get(c.thread_root_id)||[];list.push(c);groups.set(c.thread_root_id,list)}else roots.push(c)}
 return {byId,threads:roots.map(root=>{const group=groups.get(root.id)||[],linked=new Set(group.filter(c=>!c.deleted_at).map(c=>c.reply_to_comment_id));return {root,replies:group.filter(c=>!c.deleted_at||linked.has(c.id)),count:group.filter(c=>!c.deleted_at).length}}).filter(x=>!x.root.deleted_at||x.count>0)};
}
function renderThreadCard(c,byId,h){
 const {esc,dt,author,canEdit,canDelete,subtask,editingId,editingDraft,selectedSubtaskId}=h;
 const deleted=!!c.deleted_at,reply=!!c.reply_to_comment_id,edited=!deleted&&c.updated_at&&new Date(c.updated_at)-new Date(c.created_at)>1000;
 const replySvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10 4 15l5 5"/><path d="M4 15h10a6 6 0 0 0 6-6V5"/></svg>';
 const pencilSvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2.5a2.121 2.121 0 0 1 3 3L7 19.5l-4 1 1-4Z"/><path d="m15.5 5.5 3 3"/></svg>';
 const crossSvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 18 18M18 6 6 18"/></svg>';
 const actions=deleted?'':`<span class="task-comment-actions"><button type="button" data-action="reply-task-comment" data-id="${esc(c.id)}" aria-label="Ответить на комментарий" title="Ответить">${replySvg}</button>${canEdit(c)?`<button type="button" data-action="edit-task-comment" data-id="${esc(c.id)}" aria-label="Редактировать комментарий" title="Редактировать комментарий">${pencilSvg}</button>`:''}${canDelete(c)?`<button type="button" data-action="delete-task-comment" data-id="${esc(c.id)}" aria-label="Удалить комментарий" title="Удалить комментарий">${crossSvg}</button>`:''}</span>`;
 const parent=reply?byId.get(c.reply_to_comment_id):null;
 const quote=reply?`<button type="button" class="task-comment-quote" data-action="jump-task-comment" data-id="${esc(c.reply_to_comment_id)}" aria-label="Перейти к цитируемому сообщению"><b>Ответ ${esc(parent?author(parent.user_id):'на сообщение')}</b><span>${esc(parent&&!parent.deleted_at?String(parent.body||'').replace(/\s+/g,' ').slice(0,140):'Комментарий удалён')}</span></button>`:'';
 const s=subtask(c);
 const body=deleted?'<div class="task-comment-deleted">Комментарий удалён</div>':`${quote}${s?`<div class="task-comment-subtask-label">@${esc(s.title)}</div>`:c.subtask_id?'<div class="task-comment-subtask-label">@Подзадача удалена</div>':''}${editingId===c.id?`<div class="task-comment-edit"><textarea class="input textarea task-comment-edit-text" data-id="${esc(c.id)}" aria-label="Редактировать комментарий">${esc(editingDraft??c.body)}</textarea><div class="task-comment-edit-actions"><button type="button" data-action="cancel-task-comment-edit">Отмена</button><button type="button" data-action="save-task-comment-edit" data-id="${esc(c.id)}">Сохранить</button></div></div>`:`<div class="task-comment-body">${esc(c.body)}</div>`}`;
 return `<div class="task-comment ${deleted?'is-deleted':''} ${reply?'is-reply':''} ${selectedSubtaskId&&c.subtask_id===selectedSubtaskId?'is-current-subtask':''}" data-comment-id="${esc(c.id)}"><div class="task-comment-meta"><b>${esc(author(c.user_id))}</b><span>${dt(c.created_at)}</span>${edited?'<span>изменено</span>':''}${actions}</div>${body}</div>`;
}
function renderThreads(rows,taskId,collapsed,helpers){
 const data=threadStructure(rows,taskId);
 const html=data.threads.map(({root,replies,count})=>{
  const closed=collapsed?.has(root.id);
  const toggle=count?`<button type="button" class="task-thread-toggle" data-action="toggle-comment-thread" data-id="${helpers.esc(root.id)}" aria-expanded="${closed?'false':'true'}"><span>${count} ${count===1?'ответ':count<5?'ответа':'ответов'}</span><span aria-hidden="true">${closed?'▾':'▴'}</span></button>`:'';
  return `<div class="task-comment-thread" data-thread-id="${helpers.esc(root.id)}">${renderThreadCard(root,data.byId,helpers)}${toggle}${closed?'':`<div class="task-thread-replies">${replies.map(c=>renderThreadCard(c,data.byId,helpers)).join('')}</div>`}</div>`;
 }).join('');
 return html;
}
window.ProjectTrackerCommentThreads={structure:threadStructure,render:renderThreads};
})();
