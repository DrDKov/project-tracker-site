(function planningBootstrap(){
 'use strict';
 if(window.ProjectTrackerPlanning)return;
 let api=null,rows=[],identity='',channel=null,request=0,dragId=null,busy=false,loaded=false;
 const $=id=>document.getElementById(id);
 const context=()=>api?.getContext?.()||{};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const errorText=e=>e?.message||String(e);
 const status=msg=>{for(const id of ['planningStatus','planningDrawerStatus']){const el=$(id);if(el)el.textContent=msg||''}};
 const canEditProject=(p,c=context())=>{
  if(!p||p.deleted_at||!c.profile)return false;
  if(['admin','owner'].includes(c.profile.role)||p.owner_id===c.profile.id)return true;
  return (c.members||[]).some(m=>m.project_id===p.id&&m.user_id===c.profile.id&&['owner','editor'].includes(m.access_role));
 };
 const eligibleUsers=(projectId,c=context())=>{
  if(!projectId)return [];
  const p=(c.projects||[]).find(x=>x.id===projectId&&!x.deleted_at);
  if(!p)return [];
  return (c.users||[]).filter(u=>u.is_active!==false&&(
   ['owner','admin'].includes(u.role)||u.id===p.owner_id||
   (c.members||[]).some(m=>m.project_id===projectId&&m.user_id===u.id)
  ));
 };
 const projects=()=>{const c=context();return (c.projects||[]).filter(p=>canEditProject(p,c))};
 function selectors(item,writable){
  const opts=['<option value="">Без проекта</option>',...projects().map(p=>`<option value="${esc(p.id)}" ${p.id===item.project_id?'selected':''}>${esc(p.name)}</option>`)].join('');
  const users=eligibleUsers(item.project_id);
  const assigns=['<option value="">Без исполнителя</option>',...users.map(u=>`<option value="${esc(u.id)}" ${u.id===item.assignee_id?'selected':''}>${esc(u.display_name||u.email||'Участник')}</option>`)].join('');
  return `<select class="planning-select" data-planning-field="project_id" data-id="${esc(item.id)}" aria-label="Проект задачи" ${writable?'':'disabled'}>${opts}</select><select class="planning-select" data-planning-field="assignee_id" data-id="${esc(item.id)}" aria-label="Исполнитель задачи" ${!item.project_id||!writable?'disabled':''}>${assigns}</select>`;
 }
 function itemHtml(item,drawer){
  const c=context();const writable=item.project_id?canEditProject((c.projects||[]).find(p=>p.id===item.project_id),c):item.created_by===c.profile?.id||['owner','admin'].includes(c.profile?.role);
  const disabled=writable?'':'disabled';
  const controls=drawer?`<div class="planning-row-date"><input type="date" data-planning-date="${esc(item.id)}" aria-label="Дата планирования" /><button type="button" data-planning-schedule="${esc(item.id)}" title="Назначить дату" ${disabled}>В задачи <span aria-hidden="true">→</span></button></div>`:'';
  return `<article class="planning-row" data-planning-id="${esc(item.id)}" draggable="${writable?'true':'false'}"><span class="planning-grip" title="Перетащите на проект или дату" aria-hidden="true">⠿</span><div class="planning-row-body"><input class="planning-title" data-planning-title="${esc(item.id)}" value="${esc(item.title)}" aria-label="Название неразобранной задачи" title="Нажмите Enter или выйдите из поля для сохранения" ${disabled}/><div class="planning-row-fields">${selectors(item,writable)}</div>${controls}</div><button class="planning-delete" type="button" data-planning-delete="${esc(item.id)}" aria-label="Удалить задачу из планирования" title="Удалить" ${disabled}>×</button></article>`;
 }
 function render(){
  const main=$('focusList'),drawer=$('planningDrawerList');
  if($('planningCount'))$('planningCount').textContent=String(rows.length);
  if($('planningDrawerCount'))$('planningDrawerCount').textContent=String(rows.length);
  const c=context();
  if(main&&c.view==='overview')main.innerHTML=rows.length?rows.map(r=>itemHtml(r,false)).join(''):`<p class="planning-empty">${loaded?'Неразобранных задач пока нет. Введите первую выше.':'Загрузка списка планирования…'}</p>`;
  if(drawer&&!$('planningDrawer')?.hidden)drawer.innerHTML=rows.length?rows.map(r=>itemHtml(r,true)).join(''):'<p class="planning-empty">Все задачи распределены. Добавьте новые на вкладке «Обзор».</p>';
 }
 function item(id){return rows.find(x=>x.id===id)}
 async function load(){
  const c=context(),user=c.profile?.id;
  if(!api||!c.sb||!user)return;
  const seq=++request;
  const r=await c.sb.from('planning_inbox').select('*').order('created_at',{ascending:true});
  if(seq!==request||context().profile?.id!==user)return;
  if(r.error){status('Не удалось загрузить список: '+r.error.message);return}
  rows=r.data||[];loaded=true;status('');render();
 }
 function watch(){
  const c=context();
  if(channel&&api?.client===c.sb)return;
  if(channel){try{api?.client?.removeChannel(channel)}catch{}channel=null}
  if(!c.sb||!c.profile)return;
  api.client=c.sb;
  channel=c.sb.channel('planning-inbox-realtime').on('postgres_changes',{event:'*',schema:'public',table:'planning_inbox'},()=>{load().catch(e=>status(errorText(e)))}).subscribe();
 }
 async function update(id,patch){
  const c=context(),old=item(id);if(!old)throw Error('Задача уже удалена');
  if('project_id'in patch){patch.assignee_id=null}
  if('assignee_id'in patch && patch.assignee_id && !eligibleUsers(old.project_id).some(x=>x.id===patch.assignee_id))throw Error('У исполнителя нет доступа к проекту');
  const r=await c.sb.from('planning_inbox').update(patch).eq('id',id).select('*').single();
  if(r.error)throw r.error;
  rows=rows.map(row=>row.id===id?r.data:row);render();
 }
 async function remove(id){
  if(!item(id))return;
  if(!window.confirm('Удалить эту неразобранную задачу?'))return;
  const r=await context().sb.from('planning_inbox').delete().eq('id',id);
  if(r.error)throw r.error;
  rows=rows.filter(x=>x.id!==id);render();
 }
 async function create(){
  const area=$('planningQuickInput');if(!area||busy)return;
  const items=area.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!items.length)return;
  busy=true;
  try{
   for(let i=0;i<items.length;i++){
    const title=items[i].slice(0,500);
    const r=await context().sb.from('planning_inbox').insert({title,created_by:context().profile.id}).select('*').single();
    if(r.error){area.value=items.slice(i).join('\n');throw r.error}
    rows.push(r.data);area.value=items.slice(i+1).join('\n');render();
   }
   area.value='';status('');
  }finally{busy=false;area.focus()}
 }
 async function schedule(id,date){
  const row=item(id);if(!row)throw Error('Задача отсутствует в списке');
  if(!row.project_id)throw Error('Сначала выберите проект задачи');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('Выберите корректную дату');
  const r=await context().sb.rpc('schedule_planning_item',{p_item_id:id,p_date:date});
  if(r.error)throw r.error;
  rows=rows.filter(x=>x.id!==id);
  api.onScheduled?.(r.data);
  status('Задача добавлена на '+date+'.');
  render();
 }
 function report(e){status(errorText(e))}
 function open(){const el=$('planningDrawer');if(!el)return;el.hidden=false;$('openPlanningBtn')?.setAttribute('aria-expanded','true');render()}
 function close(){const el=$('planningDrawer');if(!el)return;el.hidden=true;$('openPlanningBtn')?.setAttribute('aria-expanded','false')}
 function reset(){
  ++request;rows=[];identity='';loaded=false;status('');close();render();
  if(channel&&api?.client){try{api.client.removeChannel(channel)}catch{}channel=null}
 }
 function dropInfo(e){
  const id=dragId||e.dataTransfer?.getData('application/x-pt-planning');
  return id?item(id):null;
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('#planningQuickAdd')){e.preventDefault();create().catch(report);return}
  if(e.target.closest('#openPlanningBtn')){e.preventDefault();open();return}
  if(e.target.closest('#closePlanningBtn')){e.preventDefault();close();return}
  const del=e.target.closest('[data-planning-delete]');
  if(del){e.preventDefault();remove(del.dataset.planningDelete).catch(report);return}
  const send=e.target.closest('[data-planning-schedule]');
  if(send){e.preventDefault();const field=document.querySelector('[data-planning-date="'+send.dataset.planningSchedule+'"]');schedule(send.dataset.planningSchedule,field?.value).catch(report)}
 });
 document.addEventListener('keydown',e=>{
  if(e.target.id==='planningQuickInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();create().catch(report)}
  if(e.target.matches('[data-planning-title]')&&e.key==='Enter'){e.preventDefault();e.target.blur()}
  if(e.key==='Escape'&&!$('planningDrawer')?.hidden)close();
 });
 document.addEventListener('change',e=>{
  const field=e.target.closest('[data-planning-field]');
  if(field){const value=field.value||null;const patch={[field.dataset.planningField]:value};update(field.dataset.id,patch).catch(err=>{report(err);render()});return}
  const title=e.target.closest('[data-planning-title]');
  if(title){const value=title.value.trim();if(!value){report(new Error('Название задачи не может быть пустым'));render();return}const current=item(title.dataset.planningTitle);if(current&&current.title!==value)update(current.id,{title:value.slice(0,500)}).catch(err=>{report(err);render()})}
 });
 document.addEventListener('dragstart',e=>{
  const row=e.target.closest('.planning-row[draggable]');if(!row)return;
  dragId=row.dataset.planningId;
  if(e.dataTransfer){e.dataTransfer.setData('application/x-pt-planning',dragId);e.dataTransfer.effectAllowed='move'}
 });
 document.addEventListener('dragend',()=>{dragId=null;document.querySelectorAll('.planning-drop-active').forEach(n=>n.classList.remove('planning-drop-active'))});
 document.addEventListener('dragover',e=>{
  if(!dragId)return;
  const target=e.target.closest('.project-card[data-planning-project],.week-col[data-date],.timeline-time-grid[data-date]');
  if(!target)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.dataTransfer)e.dataTransfer.dropEffect='move';
  target.classList.add('planning-drop-active');
 },true);
 document.addEventListener('dragleave',e=>{const el=e.target.closest('.planning-drop-active');if(el&&!el.contains(e.relatedTarget))el.classList.remove('planning-drop-active')},true);
 document.addEventListener('drop',e=>{
  const row=dropInfo(e);if(!row)return;
  const target=e.target.closest('.project-card[data-planning-project],.week-col[data-date],.timeline-time-grid[data-date]');
  if(!target)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();dragId=null;
  document.querySelectorAll('.planning-drop-active').forEach(n=>n.classList.remove('planning-drop-active'));
  if(target.dataset.planningProject){if(!canEditProject((context().projects||[]).find(p=>p.id===target.dataset.planningProject))){report(new Error('Нет прав изменять этот проект'));return}update(row.id,{project_id:target.dataset.planningProject}).catch(report)}
  else if(target.dataset.date)schedule(row.id,target.dataset.date).catch(report);
 },true);
 window.addEventListener('pt-workspace-context-changed',()=>{
  const c=context(),key=c.profile?.id||'';
  if(key!==identity){identity=key;if(key){load().catch(report);watch()}else reset()}
  if(c.view!=='tasks')close();
  render();
 });
 window.addEventListener('pt-session-ended',reset);
 window.addEventListener('online',()=>{if(context().profile)load().catch(report)});
 window.ProjectTrackerPlanning={init(value){api=value;identity='';const c=context();if(c.profile){identity=c.profile.id;load().catch(report);watch()}},load,render,open,close,reset,eligibleUsers,canEditProject,getRows:()=>rows.slice()};
})();
