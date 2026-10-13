(function(){
  'use strict';
  if(window.ProjectTrackerDrafts)return;
  const $=id=>document.getElementById(id);
  const fields=['taskTitle','taskProject','taskAssignee','taskStatus','taskPriority','taskStart','taskDue','taskNotes','taskAllDay','taskStartTime','taskEndTime','taskDurationMinutes','taskRepeatEnabled','taskRepeatType','taskRepeatUntil'];
  const prefix='pt_task_draft_v1:',ttl=7*86400000;
  let active=null,timer=null,undo=null,undoSequence=0,undoTimer=null;
  function identity(){let id=window.currentAuth?.id;return id?encodeURIComponent(window.sb?.supabaseUrl||location.origin)+':'+id:null}
  function key(id,who=identity()){return who?prefix+who+':'+(id||'new'):null}
  function snapshot(){
    let values={};for(let id of fields){let f=$(id);if(f)values[id]=f.multiple?Array.from(f.selectedOptions,o=>o.value):f.type==='checkbox'?f.checked:f.value}
    values.weekdays=Array.from(document.querySelectorAll('#taskForm .task-repeat-weekday:checked'),f=>f.value);
    values.scope=document.querySelector('#taskForm [name="taskRecurrenceScope"]:checked')?.value||'one';
    return values;
  }
  function read(k){try{let d=JSON.parse(localStorage.getItem(k)||'null');if(!d||d.version!==1||Date.now()-d.at>ttl||!d.values||typeof d.values!=='object'){localStorage.removeItem(k);return null}return d}catch{return null}}
  function remove(k){if(k)try{localStorage.removeItem(k)}catch{}}
  function hint(text){let el=$('taskDraftStatus');if(el)el.textContent=text}
  function banner(saved){let el=$('taskDraftRestore');if(!el)return;el.hidden=!saved;if(saved)$('taskDraftRestoreText').textContent='Есть черновик от '+new Date(saved.at).toLocaleString('ru-RU')}
  function prune(who){try{let entries=Object.keys(localStorage).filter(k=>k.startsWith(prefix+who+':')).map(k=>({k,d:read(k)})).filter(x=>x.d).sort((a,b)=>b.d.at-a.d.at);for(let x of entries.slice(20))remove(x.k)}catch{}}
  function capture(){
    clearTimeout(timer);timer=null;if(!active||active.who!==identity()||active.pending)return false;
    let values=snapshot(),comment=$('taskCommentText')?.value||'',editor=document.querySelector('#taskForm .task-comment-edit-text');
    let edit=editor?{id:editor.dataset.id,body:editor.value}:active.edit||null;
    if(JSON.stringify(values)===active.baseline&&!comment&&!edit){remove(active.key);hint('');return true}
    let draft={version:1,at:Date.now(),values,comment,subtaskId:active.subtaskId||null,replyId:active.replyId||null,edit,persistedTaskId:active.persistedTaskId||null};
    try{let data=JSON.stringify(draft);if(data.length>100000)throw Error('large');localStorage.setItem(active.key,data);prune(active.who);hint('Черновик сохранён на этом устройстве');return true}catch{hint('Не удалось сохранить черновик на устройстве. Не закрывайте задачу.');return false}
  }
  function beforeOpen(){capture();active=null;banner(null)}
  function opened(){
    let who=identity();if(!who)return;let id=$('taskId')?.value||'',k=key(id,who),saved=read(k);
    active={who,id,key:k,baseline:JSON.stringify(snapshot()),subtaskId:null,replyId:null,pending:saved};
    banner(saved);hint('');
  }
  function changed(){if(!active||active.who!==identity())return;active.pending=null;banner(null);clearTimeout(timer);timer=setTimeout(capture,450)}
  function restoreDraft(){
    let d=active?.pending;if(!d||active.who!==identity())return;
    if(d.persistedTaskId){if(!(window.tasks||[]).some(t=>t.id===d.persistedTaskId)){hint('Созданная задача пока не загружена. Обновите список перед восстановлением.');return}$('taskId').value=d.persistedTaskId;active.persistedTaskId=d.persistedTaskId;active.id=d.persistedTaskId}
    for(let id of fields){let f=$(id),value=d.values[id];if(!f||value===undefined)continue;
      if(f.multiple){let options=new Set(Array.isArray(value)?value:[]);Array.from(f.options,o=>o.selected=options.has(o.value))}
      else if(f.type==='checkbox')f.checked=!!value;
      else if(f.tagName!=='SELECT'||Array.from(f.options).some(o=>o.value===value))f.value=String(value??'');
      f.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.querySelectorAll('#taskForm .task-repeat-weekday').forEach(f=>f.checked=(d.values.weekdays||[]).includes(f.value));
    document.querySelectorAll('#taskForm [name="taskRecurrenceScope"]').forEach(f=>f.checked=f.value===d.values.scope);
    if($('taskCommentText'))$('taskCommentText').value=d.comment||'';
    active.subtaskId=d.subtaskId||null;active.replyId=d.replyId||null;active.edit=d.edit||null;active.pending=null;banner(null);
    window.dispatchEvent(new CustomEvent('pt-draft-restored',{detail:{taskId:active.id,subtaskId:active.subtaskId,replyId:active.replyId,edit:d.edit||null}}));
    $('taskForm')?.dispatchEvent(new Event('input',{bubbles:true}));capture();
  }
  function discard(){if(active)remove(active.key);active=null;clearTimeout(timer);banner(null);hint('')}
  function saved(token){remove(token?.key);if(active?.key===token?.key){active=null;clearTimeout(timer);banner(null);hint('')}}
  function commentSaved(token,body){
    let d=read(token?.key);if(d&&d.comment.trim()===body){d.comment='';d.subtaskId=null;d.replyId=null;try{localStorage.setItem(token.key,JSON.stringify(d))}catch{}}
    if(active?.key===token?.key&&$('taskCommentText')?.value.trim()===body){$('taskCommentText').value='';active.subtaskId=null;active.replyId=null;capture()}
  }
  function clearUser(userId){try{Object.keys(localStorage).filter(k=>k.startsWith(prefix)&&k.includes(':'+userId+':')).forEach(remove)}catch{}}
  function hideUndo(){clearTimeout(undoTimer);undo=null;let box=$('workspaceUndo');if(box)box.hidden=true}
  function beginAction(){undoSequence++;hideUndo()}
  async function offerUndo(table,id,label){
    // Enabled only after the server migration is explicitly approved and verified.
    if(window.__PT_WORKSPACE_UNDO_ENABLED__!==true)return;
    if(!['tasks','task_subtasks'].includes(table)||!window.sb||!identity())return;
    let who=identity(),sequence=++undoSequence;hideUndo();
    try{
      let r=await window.sb.rpc('get_workspace_undo',{p_table:table,p_id:id});
      if(r.error||!r.data?.token||sequence!==undoSequence||who!==identity())return;
      undo={...r.data,who};let box=$('workspaceUndo');if(!box)return;
      $('workspaceUndoText').textContent=label||'Изменение сохранено';$('workspaceUndoButton').disabled=false;$('workspaceUndoButton').hidden=false;box.hidden=false;
      undoTimer=setTimeout(hideUndo,12000);
    }catch{/* A saved action must not become a failure because Undo is unavailable. */}
  }
  async function undoAction(){
    let receipt=undo;if(!receipt||receipt.who!==identity())return;let b=$('workspaceUndoButton');b.disabled=true;clearTimeout(undoTimer);
    try{
      let r=await window.sb.rpc('undo_workspace_action',{p_token:receipt.token});if(r.error)throw r.error;
      if(receipt.who!==identity())return;hideUndo();
      window.dispatchEvent(new CustomEvent('pt-action-undone',{detail:r.data}));
      $('workspaceUndoText').textContent='Действие отменено';$('workspaceUndoButton').hidden=true;$('workspaceUndo').hidden=false;undoTimer=setTimeout(()=>{hideUndo();b.hidden=false},4000);
    }catch(error){if(receipt.who!==identity())return;undo=null;$('workspaceUndoText').textContent=error.message||'Не удалось отменить';b.hidden=true;undoTimer=setTimeout(()=>{hideUndo();b.hidden=false},7000)}
  }
  function boot(){
    let form=$('taskForm');if(!form)return;
    let restore=document.createElement('div');restore.id='taskDraftRestore';restore.className='task-draft-restore';restore.hidden=true;
    restore.innerHTML='<span id="taskDraftRestoreText"></span><div><button type="button" class="btn sm secondary" id="taskDraftRestoreButton">Восстановить</button><button type="button" class="btn sm secondary" id="taskDraftRemoveButton">Удалить черновик</button></div>';
    let notices=document.createElement('div');notices.className='task-inspector-notices';
    (form.querySelector('.task-inspector-tabs')||form.querySelector('.modal-head')).after(notices);notices.append(restore);if($('taskInspectorDiscard'))notices.append($('taskInspectorDiscard'));
    let status=document.createElement('span');status.id='taskDraftStatus';status.className='task-draft-status muted';status.setAttribute('role','status');form.querySelector('.modal-actions').prepend(status);
    $('taskDraftRestoreButton').onclick=restoreDraft;$('taskDraftRemoveButton').onclick=()=>{remove(active?.key);if(active)active.pending=null;banner(null)};
    form.addEventListener('input',changed);form.addEventListener('change',changed);
    form.addEventListener('click',e=>{if(e.target.closest('[data-action="cancel-task-comment-edit"]')&&active){active.edit=null;capture()}});
    $('taskModal').addEventListener('close',()=>{if(!$('taskModal').open){capture();active=null}});
    let box=document.createElement('div');box.id='workspaceUndo';box.className='workspace-undo';box.hidden=true;box.setAttribute('role','status');
    box.innerHTML='<span id="workspaceUndoText"></span><button type="button" class="btn sm secondary" id="workspaceUndoButton">Отменить</button><button type="button" class="workspace-undo-close" aria-label="Закрыть уведомление">×</button>';
    document.body.append(box);$('workspaceUndoButton').onclick=undoAction;box.querySelector('.workspace-undo-close').onclick=hideUndo;
  }
  function persisted(token,id){if(active?.key===token?.key){active.persistedTaskId=id;capture()}else{let d=read(token?.key);if(d){d.persistedTaskId=id;try{localStorage.setItem(token.key,JSON.stringify(d))}catch{}}}}
  function editSaved(id){if(active?.edit?.id===id)active.edit=null;let d=read(active?.key);if(d?.edit?.id===id){d.edit=null;try{localStorage.setItem(active.key,JSON.stringify(d))}catch{}}}
  window.ProjectTrackerDrafts={beforeOpen,opened,capture,discard,saved,commentSaved,persisted,beginAction,editSaved,token:()=>active?{key:active.key,who:active.who,id:active.id}:null,setCommentContext:id=>{if(active)active.subtaskId=id||null},setReplyContext:id=>{if(active)active.replyId=id||null},offerUndo};
  window.addEventListener('pagehide',capture);window.addEventListener('beforeunload',capture);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)capture()});
  window.addEventListener('pt-session-ended',e=>{if(e.detail.clearDrafts&&e.detail.userId)clearUser(e.detail.userId);active=null;clearTimeout(timer);banner(null);hint('');undoSequence++;hideUndo();$('taskModal')?.close();$('taskForm')?.reset();if($('taskCommentText'))$('taskCommentText').value='';if($('taskId'))$('taskId').value='';$('taskCommentsList')?.replaceChildren()});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
