/* Materials 3.1 — secure task references and a contextual picker for comments. */
(function(){
'use strict';
if(window.ProjectTrackerTaskMaterials)return;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kindNames={document:'Документ',template:'Шаблон',file:'Файл',link:'Ссылка'};
const state={taskId:null,projectId:null,links:[],materials:[],picker:null,mode:'task',loading:false,working:false,request:0,profileId:null};
const sb=()=>window.sb||null,profile=()=>window.currentProfile||null;
const canUseForTask=m=>m.scope==='team'||m.scope==='project'&&m.project_id===state.projectId;
const marker=id=>'https://drdkov.github.io/project-tracker-site/#materials/'+id;
const status=(message,bad=false)=>{for(const node of [$('taskMaterialStatus'),$('taskMaterialPickerStatus')])if(node){node.textContent=message||'';node.dataset.error=bad?'true':'false'}};
function ensureUI(){
 const form=$('taskForm'),modal=$('taskModal'),grid=form?.querySelector('.form-grid');
 if(!form||!modal||!grid)return;
 if(!$('taskMaterialsSection')){
  const section=document.createElement('section');section.id='taskMaterialsSection';section.className='full task-materials-section';
  section.innerHTML='<div class="task-materials-heading"><b>Материалы задачи</b><button type="button" class="btn secondary sm" data-task-material-choose="task">+ Прикрепить</button></div><div id="taskMaterialStatus" role="status" class="task-material-status"></div><div id="taskMaterialsList" class="task-materials-list"></div>';
  grid.appendChild(section);
 }
 const composer=form.querySelector('#taskCommentsBlock .task-comment-form');
 if(composer&&!composer.querySelector('[data-task-material-choose="comment"]')){
  const button=document.createElement('button');button.type='button';button.className='task-material-comment-button';button.dataset.taskMaterialChoose='comment';
  button.setAttribute('aria-label','Вставить материал в комментарий');button.title='Материалы и шаблоны';button.textContent='▤';
  composer.insertBefore(button,composer.querySelector('#taskCommentText')||composer.firstChild);
 }
 if(!$('taskMaterialPicker')){
  const picker=document.createElement('div');picker.id='taskMaterialPicker';picker.className='task-material-picker';picker.hidden=true;
  picker.setAttribute('role','dialog');picker.setAttribute('aria-modal','false');picker.setAttribute('aria-label','Выбор материала для задачи');
  picker.innerHTML='<div class="task-material-picker-head"><b id="taskMaterialPickerTitle">Выбрать материал</b><button type="button" class="task-material-picker-close" data-task-material-close aria-label="Закрыть">×</button></div><input id="taskMaterialSearch" class="input" type="search" placeholder="Поиск материала…" aria-label="Поиск материала"><div id="taskMaterialPickerStatus" class="task-material-status" role="status"></div><div class="task-material-picker-results" id="taskMaterialPickerResults"></div><div id="taskMaterialPickerPreview" class="task-material-picker-preview" hidden></div>';
  modal.appendChild(picker);
  $('taskMaterialSearch').addEventListener('input',renderPickerResults);
 }
 renderAttached();
}
async function onTaskOpen(taskId,projectId){
 ensureUI();
 state.taskId=taskId||null;state.projectId=projectId||null;state.links=[];
 state.profileId=profile()?.id||null;
 closePicker();renderAttached();
 if(taskId)await refreshLinks();
}
async function refreshLinks(){
 const id=state.taskId,client=sb(),token=++state.request,identity=profile()?.id;
 if(!id||!client)return;
 const r=await client.from('task_material_links').select('id,material_id,created_at').eq('task_id',id).order('created_at',{ascending:true});
 if(token!==state.request||id!==state.taskId||identity!==profile()?.id)return;
 if(r.error){status('Не удалось загрузить материалы: '+r.error.message,true);return}
 const links=r.data||[];
 if(!links.length){state.links=[];renderAttached();return}
 const m=await client.from('workspace_library').select('id,title,kind,scope,project_id,body,storage_bucket,storage_path,original_name,mime_type').in('id',links.map(x=>x.material_id)).is('deleted_at',null);
 if(token!==state.request||id!==state.taskId||identity!==profile()?.id)return;
 if(m.error){status('Ошибка чтения материалов: '+m.error.message,true);return}
 const visible=new Map((m.data||[]).map(x=>[x.id,x]));
 state.links=links.filter(x=>visible.has(x.material_id)).map(x=>({...x,material:visible.get(x.material_id)}));
 renderAttached();
}
function renderAttached(){
 const container=$('taskMaterialsList'),button=$('taskMaterialsSection')?.querySelector('[data-task-material-choose="task"]');
 if(!container)return;
 if(button)button.disabled=!state.taskId;
 if(!state.taskId){container.innerHTML='<p class="task-material-empty">Сохраните задачу, чтобы прикреплять материалы.</p>';return}
 container.innerHTML=state.links.length?state.links.map(x=>'<div class="task-material-attached"><button type="button" data-task-material-preview="'+esc(x.material.id)+'" title="Посмотреть материал">▤ '+esc(x.material.title)+'</button><span>'+esc(kindNames[x.material.kind]||'Материал')+'</span><button type="button" class="task-material-unlink" data-task-material-unlink="'+esc(x.id)+'" title="Убрать из задачи" aria-label="Убрать материал">×</button></div>').join(''):'<p class="task-material-empty">Материалы не прикреплены.</p>';
}
async function openPicker(mode='task',focusId=null){
 ensureUI();
 state.mode=mode;
 if(mode==='task'&&!state.taskId){status('Сначала сохраните задачу.',true);return}
 const popup=$('taskMaterialPicker');if(!popup)return;
 popup.hidden=false;
 $('taskMaterialPickerTitle').textContent=focusId?'Просмотр материала':mode==='comment'?'Материал в комментарий':'Прикрепить материал к задаче';
 $('taskMaterialSearch').value='';$('taskMaterialSearch').hidden=!!focusId;
 const panel=$('taskMaterialPickerPreview');panel.hidden=true;panel.replaceChildren();
 popup.dataset.mode=mode;
 $('taskMaterialPickerResults').innerHTML='<p class="task-material-empty">Загрузка…</p>';
 const client=sb(),token=++state.request,identity=profile()?.id;
 if(!client||!identity){status('Для доступа к материалам необходимо войти.',true);return}
 const r=await client.from('workspace_library').select('id,title,kind,scope,project_id,body,storage_bucket,storage_path,original_name,mime_type').is('deleted_at',null).order('title',{ascending:true});
 if(token!==state.request||identity!==profile()?.id||popup.hidden)return;
 if(r.error){status('Материалы не загрузились: '+r.error.message,true);$('taskMaterialPickerResults').innerHTML='';return}
 state.materials=r.data||[];
 status('');
 if(focusId)previewMaterial(focusId);else{renderPickerResults();$('taskMaterialSearch').focus({preventScroll:true})}
}
function renderPickerResults(){
 const target=$('taskMaterialPickerResults');if(!target)return;
 const term=($('taskMaterialSearch')?.value||'').toLocaleLowerCase('ru').trim();
 let materials=state.materials.filter(m=>state.mode==='task'?canUseForTask(m):true).filter(m=>!term||[m.title,m.body].join(' ').toLocaleLowerCase('ru').includes(term));
 if(state.mode==='task'){const attached=new Set(state.links.map(x=>x.material_id));materials=materials.filter(m=>!attached.has(m.id))}
 target.innerHTML=materials.length?materials.map(m=>{
  const shared=canUseForTask(m),isText=m.kind==='template'||m.kind==='document',tag=m.scope==='personal'?'Личный':m.scope==='team'?'Общий':'Проектный';
  const actions=state.mode==='task'?'<button type="button" data-task-material-attach="'+esc(m.id)+'">Прикрепить</button>':
    (isText?'<button type="button" data-task-material-insert-text="'+esc(m.id)+'">Вставить текст</button>':'')+
    (shared?'<button type="button" data-task-material-insert-link="'+esc(m.id)+'">Ссылка</button>':'')+
    (m.kind==='link'?'<button type="button" data-task-material-insert-url="'+esc(m.id)+'">Вставить URL</button>':'');
  return '<article class="task-material-option"><div><b>'+esc(m.title)+'</b><small>'+esc(kindNames[m.kind])+' · '+tag+'</small></div><div class="task-material-option-actions"><button type="button" data-task-material-preview="'+esc(m.id)+'">Просмотр</button>'+actions+'</div></article>';
 }).join(''):'<p class="task-material-empty">Подходящих материалов нет. Для прикрепления используйте общие материалы или материалы проекта этой задачи.</p>';
}
function closePicker(){const el=$('taskMaterialPicker');if(el)el.hidden=true}
async function attach(id){
 if(state.working||!state.taskId)return;
 const m=state.materials.find(x=>x.id===id);
 if(!m||!canUseForTask(m))return status('Этот материал нельзя прикрепить к выбранному проекту.',true);
 state.working=true;const t=state.taskId;
 try{const r=await sb().from('task_material_links').insert({task_id:t,material_id:id,created_by:profile()?.id});if(r.error&&r.error.code!=='23505')throw r.error;await refreshLinks();renderPickerResults();status('Материал прикреплён.')}
 catch(e){status(e.message||String(e),true)}
 finally{state.working=false}
}
async function unlink(id){if(state.working)return;state.working=true;try{const r=await sb().from('task_material_links').delete().eq('id',id);if(r.error)throw r.error;await refreshLinks();status('Материал откреплён.')}catch(e){status(e.message||String(e),true)}finally{state.working=false}}
function insertComment(content){
 const field=$('taskCommentText');if(!field)return status('Откройте комментарии задачи.',true);
 const prefix=field.value&& !field.value.endsWith('\n')?'\n':'';
 const addition=prefix+content;const at=field.selectionStart??field.value.length;
 field.setRangeText(addition,at,field.selectionEnd??at,'end');
 field.dispatchEvent(new Event('input',{bubbles:true}));
 closePicker();
 window.ProjectTrackerTaskInspector?.reveal({tab:'comments'});
 field.focus({preventScroll:true});
}
async function previewMaterial(id){
 if(!UUID.test(id))return;
 let item=state.materials.find(m=>m.id===id);
 if(!item){
  const r=await sb()?.from('workspace_library').select('id,title,kind,scope,project_id,body,storage_bucket,storage_path,original_name,mime_type').eq('id',id).is('deleted_at',null).maybeSingle();
  if(r?.error||!r?.data){status('Материал недоступен или удалён.',true);return}
  item=r.data;state.materials.push(item);
 }
 const container=$('taskMaterialPickerPreview');if(!container)return;container.hidden=false;container.replaceChildren();
 const h=document.createElement('h4');h.textContent=item.title;container.appendChild(h);
 const text=document.createElement('div');text.className='task-material-preview-content';
 if(item.kind==='file'){
   text.textContent='Загрузка предпросмотра…';container.appendChild(text);
   const r=await sb().storage.from(item.storage_bucket).createSignedUrl(item.storage_path,300);
   if(r.error){text.textContent='Не удалось открыть файл: '+r.error.message;return}
   text.replaceChildren();
   if((item.mime_type||'').startsWith('image/')){const img=document.createElement('img');img.src=r.data.signedUrl;img.alt=item.title;text.appendChild(img)}
   else if(item.mime_type==='application/pdf'||/\.pdf$/i.test(item.original_name||'')){const frame=document.createElement('iframe');frame.title='Материал: '+item.title;frame.referrerPolicy='no-referrer';frame.src=r.data.signedUrl;text.appendChild(frame)}
   else{text.textContent='Этот тип файла открывается в новой вкладке.';const a=document.createElement('a');a.href=r.data.signedUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Открыть файл';text.appendChild(a)}
 }else{text.textContent=item.body||'Нет содержимого';container.appendChild(text)}
}
function openCommentLink(id){
 if(!UUID.test(id))return;
 openPicker('preview',id);
}
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-task-material-choose],[data-task-material-close],[data-task-material-attach],[data-task-material-unlink],[data-task-material-preview],[data-task-material-insert-text],[data-task-material-insert-link],[data-task-material-insert-url],[data-library-open]');
 if(!button)return;
 if(button.dataset.libraryOpen){e.preventDefault();e.stopPropagation();openCommentLink(button.dataset.libraryOpen);return}
 if(button.dataset.taskMaterialChoose){e.preventDefault();openPicker(button.dataset.taskMaterialChoose);return}
 if(button.hasAttribute('data-task-material-close')){e.preventDefault();closePicker();return}
 if(button.dataset.taskMaterialAttach){e.preventDefault();attach(button.dataset.taskMaterialAttach);return}
 if(button.dataset.taskMaterialUnlink){e.preventDefault();unlink(button.dataset.taskMaterialUnlink);return}
 if(button.dataset.taskMaterialPreview){e.preventDefault();const id=button.dataset.taskMaterialPreview;openPicker('preview',id);return}
 if(button.dataset.taskMaterialInsertText){e.preventDefault();const m=state.materials.find(x=>x.id===button.dataset.taskMaterialInsertText);if(m)insertComment(m.body||'');return}
 if(button.dataset.taskMaterialInsertLink){e.preventDefault();const m=state.materials.find(x=>x.id===button.dataset.taskMaterialInsertLink);if(m&&canUseForTask(m))insertComment('Материал: '+m.title+'\n'+marker(m.id));return}
 if(button.dataset.taskMaterialInsertUrl){e.preventDefault();const m=state.materials.find(x=>x.id===button.dataset.taskMaterialInsertUrl);if(m&&/^https?:\/\/\S+$/i.test(m.body||''))insertComment(m.body);return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('taskMaterialPicker')?.hidden){e.preventDefault();e.stopPropagation();closePicker()}},true);
window.addEventListener('pt-workspace-context-changed',()=>{
 if(state.profileId&&profile()?.id!==state.profileId){state.taskId=null;state.projectId=null;state.links=[];state.materials=[];closePicker();renderAttached()}
});
function boot(){ensureUI()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ProjectTrackerTaskMaterials={onTaskOpen,refreshLinks,openCommentLink,canUseForTask,renderAttached,closePicker};
})();