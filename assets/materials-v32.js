/* Materials 3.2 — scoped knowledge library, collaborators, revisions and recovery. */
(function(){
'use strict';
if(window.__PT_MATERIALS_V32__)return;
window.__PT_MATERIALS_V32__=true;
const $=id=>document.getElementById(id),q=sel=>document.querySelector(sel);
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const K={document:'Документ',template:'Текстовый шаблон',workflow:'Шаблон процесса',file:'Файл',link:'Ссылка'};
const I={document:'▤',template:'▦',workflow:'☷',file:'▧',link:'↗'};
const S={db:null,id:'',projects:[],users:[],items:[],access:[],versions:[],
 view:'all',query:'',selected:null,panel:'',editing:false,draft:null,mode:'write',
 busy:false,loading:false,generation:0,lastLoad:0,error:'',status:'',formDirty:false,historyLoading:false};
const rich=()=>window.ProjectTrackerMaterialsRich;
const profile=()=>window.currentProfile||null;
const db=()=>window.sb||null;
const owner=m=>!!m&&m.owner_id===S.id;
const editor=m=>!!m&&(owner(m)||S.access.some(a=>a.material_id===m.id&&a.user_id===S.id&&a.permission==='editor'));
const visibleItems=()=>S.items.filter(m=>S.view==='trash'?!!m.deleted_at:!m.deleted_at);
const favorites=()=>{try{return JSON.parse(localStorage.getItem('pt_library_favorites:'+S.id)||'[]')}catch{return []}};
const icon=m=>I[m.kind]||'▤';
const date=x=>x?new Date(x).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const scopeLabel=m=>m.scope==='personal'?'Личный':m.scope==='team'?'Общий':'Проект · '+(S.projects.find(x=>x.id===m.project_id)?.name||'—');
function toast(text,bad=false){S.status=text||'';S.error=bad?text:'';const el=$('libraryStatus');if(el){el.textContent=text||'';el.dataset.error=bad?'true':'false'}}
function filter(){
 const term=S.query.toLocaleLowerCase('ru');
 const rows=visibleItems().filter(m=>{
  if(S.view==='trash')return owner(m);
  if(S.view==='personal')return m.scope==='personal';
  if(S.view==='team')return m.scope==='team';
  if(S.view==='project')return m.scope==='project';
  if(S.view==='favorites')return favorites().includes(m.id);
  return true;
 }).filter(m=>!term||[m.title,m.body,m.collection_name,K[m.kind]].join(' ').toLocaleLowerCase('ru').includes(term));
 return rows.sort((a,b)=>S.view==='recent'||S.view==='trash'?
  Date.parse(b.deleted_at||b.updated_at||0)-Date.parse(a.deleted_at||a.updated_at||0)
  :String(a.title).localeCompare(String(b.title),'ru'));
}
function navigation(){
 return [['all','Все материалы'],['personal','Личные'],['team','Общие'],['project','Проекты'],['favorites','Избранное'],['recent','Недавние'],['trash','Корзина']].map(([id,label])=>
 '<button type="button" class="library-nav-item '+(id===S.view?'active':'')+'" data-library-view="'+id+'">'+label+'</button>').join('');
}
function rowsHTML(){
 const rows=filter();
 return rows.length?rows.map(m=>'<button type="button" class="library-row '+(m.id===S.selected?'active':'')+'" data-library-select="'+E(m.id)+'">'+
  '<span class="library-row-icon">'+icon(m)+'</span><span class="library-row-copy"><b>'+E(m.title)+'</b>'+
  '<small>'+E(K[m.kind])+' · '+E(scopeLabel(m))+' · v'+Number(m.version_number||1)+'</small></span>'+
  '<span class="library-row-date">'+date(m.deleted_at||m.updated_at)+'</span></button>').join(''):
  '<div class="library-empty">'+(S.view==='trash'?'Корзина пуста':'Нет подходящих материалов')+'</div>';
}
function optionList(map,value){return Object.entries(map).map(([k,v])=>'<option value="'+E(k)+'" '+(value===k?'selected':'')+'>'+E(v)+'</option>').join('')}
function workflowSteps(m){
 return String(m.body||'').split('\n').filter(x=>/^\s*[-*]\s+\[[ xX]\]\s+\S/.test(x)).length;
}
function readPreview(m){
 if(m.kind==='file')return '<p>Файл: '+E(m.original_name||m.title)+'</p><p>Размер: '+(Number(m.size_bytes||0)/1024).toFixed(1)+' КБ</p><div id="libraryFilePreview"></div>';
 if(m.kind==='link')return '<p class="library-url">'+E(m.body)+'</p>';
 return '<div class="library-readable library-rich-display">'+(rich()?.render(m.body||'')||E(m.body||''))+'</div>';
}
function permissionsPanel(m){
 if(!owner(m))return '';
 const assigned=S.access.filter(x=>x.material_id===m.id);
 const people=S.users.filter(u=>u.id!==S.id&&u.is_active!==false&&
  !assigned.some(a=>a.user_id===u.id));
 return '<div class="library-subpanel"><h4>Редакторы материала</h4><p class="library-subpanel-intro">Приглашённый сотрудник сможет читать и изменять документ, но не сможет менять его видимость или удалять.</p>'+
 '<div class="library-access-list">'+(assigned.length?assigned.map(a=>{
  const u=S.users.find(x=>x.id===a.user_id);
  return '<div class="library-access-row"><span>'+E(u?.display_name||u?.email||a.user_id)+'</span><span>Редактор</span><button type="button" data-library-revoke="'+E(a.user_id)+'">Убрать</button></div>'
 }).join(''):'<p class="library-empty">Дополнительных редакторов нет</p>')+'</div>'+
 '<div class="library-access-add"><select class="input" id="libraryEditorUser"><option value="">Выберите сотрудника</option>'+
 people.map(u=>'<option value="'+E(u.id)+'">'+E(u.display_name||u.email||'Сотрудник')+'</option>').join('')+
 '</select><button class="btn secondary" type="button" data-library-grant>Назначить</button></div>'+
 '<small>Для проектного материала назначение действует только пока сотрудник имеет доступ к проекту.</small></div>';
}
function versionsPanel(m){
 return '<div class="library-subpanel"><h4>История версий</h4><p class="library-subpanel-intro">Каждое сохранение создаёт отдельную ревизию. При восстановлении предыдущая версия остаётся в истории.</p>'+
 '<div class="library-version-list">'+(S.historyLoading?'<p>Загрузка истории…</p>':
 S.versions.length?S.versions.map(v=>'<div class="library-version-row"><div><b>Версия '+v.version_number+'</b><small>'+date(v.created_at)+
 ' · '+E(S.users.find(x=>x.id===v.edited_by)?.display_name||'Сотрудник')+'</small></div>'+
 '<button type="button" data-library-version-preview="'+v.version_number+'">Просмотр</button>'+
 (editor(m)&&!m.deleted_at&&Number(v.version_number)!==Number(m.version_number)?'<button type="button" data-library-restore-version="'+v.version_number+'">Восстановить</button>':'')+'</div>').join(''):'<p class="library-empty">Версии ещё не загружены</p>')+'</div><div id="libraryVersionPreview" class="library-version-preview" hidden></div></div>';
}
function workflowPanel(m){
 if(m.kind!=='workflow'||m.deleted_at)return '';
 return '<div class="library-subpanel"><h4>Создать задачу по шаблону</h4>'+
 '<p class="library-subpanel-intro">Будет создана задача и '+workflowSteps(m)+' подзадач из чек-листа. Шаблон при этом останется неизменным.</p>'+
 '<label>Проект<select class="input" id="libraryWorkflowProject"><option value="">Выберите проект</option>'+
 S.projects.map(p=>'<option value="'+E(p.id)+'" '+(p.id===m.project_id?'selected':'')+'>'+E(p.name)+'</option>').join('')+
 '</select></label><label>Дата<input type="date" class="input" id="libraryWorkflowDate"></label>'+
 '<button type="button" class="btn primary" data-library-run-workflow>Создать задачу и подзадачи</button></div>';
}
function previewHTML(m){
 if(!m)return '<div class="library-empty library-intro"><span>▤</span><h3>Библиотека материалов</h3><p>Выберите материал или создайте новый.</p></div>';
 const deleted=!!m.deleted_at,canEdit=editor(m);
 const actions=deleted?'<button type="button" class="btn primary" data-library-restore="'+E(m.id)+'">Восстановить из корзины</button>':
 (m.kind==='file'?'<button type="button" class="btn secondary" data-library-preview-file="'+E(m.id)+'">Предпросмотр</button><button type="button" class="btn secondary" data-library-open-file="'+E(m.id)+'">Открыть файл</button>':'')+
 (m.kind==='template'?'<button type="button" class="btn secondary" data-library-copy="'+E(m.id)+'">Копировать текст</button>':'')+
 (m.kind==='link'?'<button type="button" class="btn secondary" data-library-external="'+E(m.id)+'">Открыть ссылку</button>':'')+
 (canEdit?'<button type="button" class="btn secondary" data-library-edit="'+E(m.id)+'">Редактировать</button>':'')+
 (m.kind==='file'&&canEdit?'<label class="btn secondary library-replace-button">Новая версия файла<input type="file" id="libraryReplaceFile" data-library-replace-file="'+E(m.id)+'" hidden></label>':'')+
 '<button type="button" class="btn secondary" data-library-history="'+E(m.id)+'">Версии</button>'+
 (owner(m)?'<button type="button" class="btn secondary" data-library-access="'+E(m.id)+'">Доступ</button>'+
 '<button type="button" class="btn danger" data-library-delete="'+E(m.id)+'">В корзину</button>':'')+
 (m.kind==='workflow'?'<button type="button" class="btn secondary" data-library-workflow="'+E(m.id)+'">Использовать шаблон</button>':'');
 const panel=S.panel==='history'?versionsPanel(m):S.panel==='access'?permissionsPanel(m):S.panel==='workflow'?workflowPanel(m):'';
 return '<div class="library-preview-head"><div><span class="library-kicker">'+E(K[m.kind])+' · '+E(scopeLabel(m))+
  ' · Версия '+Number(m.version_number||1)+'</span><h3>'+E(m.title)+'</h3><span class="library-subtitle">'+E(m.collection_name||'Без коллекции')+
  ' · '+(deleted?'Удалено ':'Изменено ')+date(m.deleted_at||m.updated_at)+'</span></div>'+
  '<button type="button" class="library-icon-btn" data-library-star="'+E(m.id)+'">'+(favorites().includes(m.id)?'★':'☆')+'</button></div>'+
  '<div class="library-preview-actions">'+actions+'</div><div class="library-preview-body">'+
  (deleted?'<p class="library-trash-note">Материал находится в корзине. Файлы и версии сохранены.</p>':readPreview(m))+'</div>'+panel;
}
function editorHTML(m){
 const locked=m.id&&!owner(m),content=m.kind!=='file';
 const richMode=S.mode==='preview';
 return '<form id="libraryEditor" class="library-form"><div class="library-form-head"><h3>'+ (m.id?'Редактировать материал':'Новый материал')+
 '</h3><button class="library-icon-btn" type="button" data-library-cancel>×</button></div>'+
 '<label>Название<input class="input" name="title" required maxlength="500" value="'+E(m.title||'')+'"></label>'+
 '<label>Тип<select class="input" name="kind" '+(m.id?'disabled':'')+'>'+optionList(K,m.kind)+'</select></label>'+
 '<label>Видимость<select class="input" name="scope" '+(locked?'disabled':'')+'>'+optionList({personal:'Личный',team:'Общий',project:'Проектный'},m.scope)+'</select></label>'+
 '<label data-library-project-wrap '+(m.scope!=='project'?'hidden':'')+'>Проект<select class="input" name="project_id" '+(locked?'disabled':'')+'>'+
 '<option value="">Выберите проект</option>'+S.projects.map(p=>'<option value="'+E(p.id)+'" '+(p.id===m.project_id?'selected':'')+'>'+E(p.name)+'</option>').join('')+'</select></label>'+
 '<label>Коллекция<input class="input" name="collection_name" maxlength="140" value="'+E(m.collection_name||'')+'"></label>'+
 (content?'<div class="library-rich-edit-group"><div class="library-editor-modes"><button type="button" data-library-editor-mode="write" class="'+(!richMode?'active':'')+'">Редактор</button><button type="button" data-library-editor-mode="preview" class="'+(richMode?'active':'')+'">Предпросмотр</button></div>'+
 (m.kind==='link'?'':rich()?.toolbar()||'')+
 '<label class="library-body-label" '+(richMode?'hidden':'')+'>'+(m.kind==='link'?'URL (https://)':'Содержимое документа')+
 '<textarea class="input textarea" name="body" id="libraryRichBody" rows="15" placeholder="'+(m.kind==='workflow'?'Добавьте шаги через «Чек-лист»':'Введите текст материала')+'">'+E(m.body||'')+'</textarea></label>'+
 '<div id="libraryEditorPreview" class="library-rich-display library-editor-preview" '+(!richMode?'hidden':'')+'>'+
 (rich()?.render(m.body||'')||E(m.body||''))+'</div></div>':
  (m.id?'<p class="library-subpanel-intro">Для обновления содержимого используйте «Новая версия файла» в режиме просмотра.</p>':
   '<label>Файл<input type="file" name="file" required></label>'))+
 (m.id?'<p class="library-version-hint">Редактируется версия '+Number(m.version_number||1)+
 '. Если другой сотрудник сохранит изменения раньше, Workspace предупредит о конфликте.</p>':'')+
 '<div class="library-form-actions"><button type="button" class="btn secondary" data-library-cancel>Отмена</button>'+
 '<button class="btn primary" type="submit" '+(S.busy?'disabled':'')+'>Сохранить</button></div></form>';
}
function render(){
 const root=$('materialsRoot');if(!root)return;
 const selected=S.items.find(x=>x.id===S.selected);
 const sectionTitle={all:'Все материалы',personal:'Личные',team:'Общие',project:'Проекты',favorites:'Избранное',recent:'Недавние',trash:'Корзина'}[S.view];
 root.innerHTML='<div class="library-shell"><div class="library-toolbar"><div><h2>Материалы</h2><span>Документы, шаблоны, процессы и файлы</span></div>'+
 '<div class="library-toolbar-actions"><button type="button" class="btn secondary" data-library-reload title="Обновить">↻</button><button type="button" class="btn primary" data-library-new>+ Создать</button></div></div>'+
 '<div id="libraryStatus" class="library-status" role="status"></div>'+
 '<div class="library-search-wrap"><input id="librarySearch" class="input" type="search" placeholder="Поиск по материалам…" value="'+E(S.query)+'"></div>'+
 '<div class="library-layout"><nav class="library-side">'+navigation()+'</nav><section class="library-list"><div class="library-list-head"><b>'+
 sectionTitle+'</b><span>'+filter().length+'</span></div><div id="libraryItems" class="library-list-scroll">'+rowsHTML()+'</div></section>'+
 '<section class="library-preview">'+(S.editing?editorHTML(S.draft):previewHTML(selected))+'</section></div></div>';
 if(S.status)toast(S.status,!!S.error);else if(S.loading)toast('Загрузка материалов…');
 const search=$('librarySearch');if(search)search.addEventListener('input',()=>{S.query=search.value;$('libraryItems').innerHTML=rowsHTML()});
 const form=$('libraryEditor');
 if(form){
  form.querySelector('[name="scope"]')?.addEventListener('change',e=>{
   form.querySelector('[data-library-project-wrap]').hidden=e.target.value!=='project';S.formDirty=true;
  });
  form.querySelector('[name="kind"]')?.addEventListener('change',e=>{cacheForm();S.draft.kind=e.target.value;S.mode='write';render()});
  form.addEventListener('input',()=>{S.formDirty=true});
  form.addEventListener('submit',save);
 }
}
function cacheForm(){
 const form=$('libraryEditor');if(!form||!S.draft)return;
 const data=new FormData(form);
 S.draft={...S.draft,title:String(data.get('title')||''),body:String(data.get('body')??S.draft.body??''),
  collection_name:String(data.get('collection_name')||''),scope:String(data.get('scope')||S.draft.scope),
  project_id:String(data.get('project_id')||'')||null};
}
function guardDirty(){
 if(!S.editing||!S.formDirty)return true;
 return window.confirm('Есть несохранённые изменения. Закрыть редактор без сохранения?');
}
function navigateSelection(id){
 if(!guardDirty())return;
 S.selected=id;S.panel='';S.editing=false;S.formDirty=false;S.versions=[];render();
}
async function load(){
 if(!S.db||!S.id||S.loading)return;
 S.loading=true;const generation=S.generation;
 try{
  const [live,trash,projects,access,users]=await Promise.all([
    S.db.from('workspace_library').select('*').is('deleted_at',null).order('updated_at',{ascending:false}),
    S.db.from('workspace_library').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
    S.db.from('projects').select('id,name').is('deleted_at',null).order('name',{ascending:true}),
    S.db.from('library_access').select('material_id,user_id,permission,created_at'),
    S.db.from('app_users').select('id,display_name,email,is_active')
  ]);
  if(generation!==S.generation)return;
  if(live.error)throw live.error;
  if(trash.error)throw trash.error;
  S.items=[...(live.data||[]),...(trash.data||[])];
  S.projects=projects.error?[]:projects.data||[];
  S.access=access.error?[]:access.data||[];
  S.users=users.error?[]:users.data||[];
  S.lastLoad=Date.now();S.error='';S.status='';
  if(S.selected&&!S.items.some(m=>m.id===S.selected)){S.selected=null;S.panel='';S.editing=false}
 }catch(e){if(generation===S.generation){S.error=e.message||String(e);S.status='Ошибка материалов: '+S.error}}
 finally{if(generation===S.generation){S.loading=false;render()}}
}
function select(id){navigateSelection(id)}
function newMaterial(){
 if(!guardDirty())return;
 S.editing=true;S.formDirty=false;S.mode='write';S.panel='';
 S.draft={kind:'document',scope:'personal',title:'',body:'',collection_name:'',project_id:null};
 render();$('libraryEditor')?.querySelector('[name="title"]')?.focus();
}
function edit(id){
 const m=S.items.find(x=>x.id===id);if(!editor(m)||m.deleted_at)return;
 S.selected=id;S.editing=true;S.formDirty=false;S.mode='write';S.draft={...m};
 render();
}
async function save(e){
 e.preventDefault();if(S.busy||!S.draft)return;
 cacheForm();const m={...S.draft},old=S.items.find(x=>x.id===m.id),actual=profile()?.id;
 if(!String(m.title||'').trim())return toast('Укажите название',true);
 if(m.scope==='project'&&!m.project_id)return toast('Выберите проект',true);
 if(m.kind==='link'&&!/^https:\/\/\//i.test(m.body||'')&&!/^http:\/\//i.test(m.body||''))return toast('Укажите адрес http:// или https://',true);
 S.busy=true;const client=S.db;
 try{
  let result;
  if(!m.id){
   const data={title:m.title.trim(),kind:m.kind,scope:m.scope,project_id:m.scope==='project'?m.project_id:null,
    body:m.kind==='file'?'':m.body||'',collection_name:m.collection_name||'',owner_id:actual};
   if(m.kind==='file'){
    const file=$('libraryEditor')?.querySelector('[name="file"]')?.files[0];if(!file)throw Error('Выберите файл');
    const id=crypto.randomUUID(),safe=file.name.replace(/[^\w.\-]/g,'_').slice(-100);
    const path=id+'/'+crypto.randomUUID()+'_'+safe;
    Object.assign(data,{id,storage_bucket:'workspace-library',storage_path:path,original_name:file.name,
      mime_type:file.type||null,size_bytes:file.size});
    result=await client.from('workspace_library').insert(data).select('*').single();
    if(result.error)throw result.error;
    const uploaded=await client.storage.from('workspace-library').upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(uploaded.error){await client.from('workspace_library').delete().eq('id',id);throw uploaded.error}
   }else{
    result=await client.from('workspace_library').insert(data).select('*').single();
    if(result.error)throw result.error;
   }
  }else if(m.kind==='file'){
   if(!owner(m))throw Error('Изменение метаданных файла доступно владельцу');
   if(m.scope!==old.scope||m.project_id!==old.project_id){
    const upd=await client.from('workspace_library').update({scope:m.scope,project_id:m.scope==='project'?m.project_id:null}).eq('id',m.id);
    if(upd.error)throw upd.error;
   }
   result={data:old};
  }else{
   result=await client.rpc('library_save_revision',{p_id:m.id,p_expected_version:m.version_number,p_title:m.title.trim(),
     p_body:m.body||'',p_collection:m.collection_name||''});
   if(result.error)throw result.error;
   if(owner(m)&&(m.scope!==old.scope||m.project_id!==old.project_id)){
    const accessUpdate=await client.from('workspace_library').update({scope:m.scope,project_id:m.scope==='project'?m.project_id:null}).eq('id',m.id);
    if(accessUpdate.error)throw Error('Содержимое сохранено, но доступ не обновился: '+accessUpdate.error.message);
   }
  }
  const id=result.data?.id||m.id;
  S.editing=false;S.formDirty=false;S.draft=null;S.selected=id;S.panel='';
  await load();toast('Материал сохранён');
 }catch(err){toast(err.message||String(err),true)}
 finally{S.busy=false}
}
async function setTrash(id,trashed){
 const m=S.items.find(x=>x.id===id);if(!m||!owner(m))return;
 if(trashed&&!window.confirm('Переместить материал в корзину? История и файлы сохранятся.'))return;
 const r=await S.db.rpc('library_set_trashed',{p_id:id,p_trashed:trashed});
 if(r.error)return toast(r.error.message,true);
 S.selected=null;S.panel='';await load();toast(trashed?'Материал перемещён в корзину':'Материал восстановлен');
}
async function history(id){
 const material=S.items.find(x=>x.id===id);if(!material)return;
 S.panel='history';S.versions=[];S.historyLoading=true;render();
 const r=await S.db.from('library_versions').select('*').eq('material_id',id).order('version_number',{ascending:false});
 if(id!==S.selected)return;
 S.historyLoading=false;
 if(r.error){toast(r.error.message,true);return}
 S.versions=r.data||[];render();
}
async function restoreRevision(version){
 const m=S.items.find(x=>x.id===S.selected);
 if(!editor(m))return;
 if(!window.confirm('Восстановить версию '+version+'? Будет создана новая версия, текущая сохранится в истории.'))return;
 const r=await S.db.rpc('library_restore_revision',{p_id:m.id,p_restore_version:Number(version),
  p_expected_version:Number(m.version_number)});
 if(r.error)return toast(r.error.code==='40001'?'Материал изменился у другого сотрудника. Обновите версию.':r.error.message,true);
 S.panel='';await load();await history(m.id);toast('Версия восстановлена');
}
async function grant(){
 const m=S.items.find(x=>x.id===S.selected),person=$('libraryEditorUser')?.value;
 if(!owner(m)||!person)return toast('Выберите сотрудника',true);
 const r=await S.db.from('library_access').insert({material_id:m.id,user_id:person,permission:'editor',granted_by:S.id});
 if(r.error)return toast(r.error.message,true);
 await load();toast('Редактор назначен');
}
async function revoke(userId){
 const m=S.items.find(x=>x.id===S.selected);if(!owner(m))return;
 const r=await S.db.from('library_access').delete().eq('material_id',m.id).eq('user_id',userId);
 if(r.error)return toast(r.error.message,true);
 await load();toast('Доступ редактора отозван');
}
async function replaceFile(id,file){
 const m=S.items.find(x=>x.id===id);if(!m||!editor(m)||m.kind!=='file'||!file)return;
 if(!window.confirm('Загрузить новую версию файла? Предыдущая останется в истории.'))return;
 const safe=file.name.replace(/[^\w.\-]/g,'_').slice(-100),path=id+'/'+crypto.randomUUID()+'_'+safe;
 const uploaded=await S.db.storage.from('workspace-library').upload(path,file,{upsert:false,contentType:file.type||undefined});
 if(uploaded.error)return toast(uploaded.error.message,true);
 const r=await S.db.rpc('library_replace_file',{p_id:id,p_expected_version:m.version_number,p_path:path,
  p_name:file.name,p_mime:file.type||null,p_size:file.size});
 if(r.error){
  await S.db.storage.from('workspace-library').remove([path]);
  return toast(r.error.code==='40001'?'Файл уже изменился у другого сотрудника. Обновите список.':r.error.message,true);
 }
 await load();toast('Новая версия файла сохранена');
}
async function openFile(m,preview){
 if(!m?.storage_bucket||!m.storage_path)return;
 const r=await S.db.storage.from(m.storage_bucket).createSignedUrl(m.storage_path,300);
 if(r.error)return toast(r.error.message,true);
 const url=r.data.signedUrl;
 if(!preview){window.open(url,'_blank','noopener,noreferrer');return}
 const target=$('libraryFilePreview')||$('libraryVersionPreview');if(!target)return;
 target.hidden=false;target.replaceChildren();
 if((m.mime_type||'').startsWith('image/')){
  const img=document.createElement('img');img.src=url;img.alt=m.title;target.appendChild(img);
 }else if(m.mime_type==='application/pdf'||/\.pdf$/i.test(m.original_name||'')){
  const iframe=document.createElement('iframe');iframe.src=url;iframe.title='Просмотр файла';iframe.referrerPolicy='no-referrer';target.appendChild(iframe);
 }else{
  const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';
  link.textContent='Открыть предыдущую версию файла';target.appendChild(link);
 }
}
function previewVersion(num){
 const v=S.versions.find(x=>Number(x.version_number)===Number(num));if(!v)return;
 const area=$('libraryVersionPreview');if(!area)return;
 area.hidden=false;
 area.innerHTML='<h5>Версия '+num+' · '+date(v.created_at)+'</h5>';
 if(v.storage_path){
  const button=document.createElement('button');button.type='button';button.className='btn secondary';
  button.textContent='Открыть файл этой версии';button.onclick=()=>openFile(v,false);
  area.appendChild(button);
 }else{
  const div=document.createElement('div');div.className='library-rich-display';
  div.innerHTML=rich()?.render(v.body)||E(v.body);
  area.appendChild(div);
 }
}
async function runWorkflow(){
 const m=S.items.find(x=>x.id===S.selected);
 const p=$('libraryWorkflowProject')?.value,d=$('libraryWorkflowDate')?.value;
 if(!m||m.kind!=='workflow'||!p)return toast('Выберите проект',true);
 const r=await S.db.rpc('library_create_workflow_task',{p_material_id:m.id,p_project_id:p,p_date:d||null});
 if(r.error)return toast(r.error.message,true);
 S.panel='';render();toast('Задача и подзадачи созданы. Откройте вкладку «Задачи».');
}
function previewCheck(e){
 const m=S.items.find(x=>x.id===S.selected);
 if(!m||!editor(m))return;
 if(!window.confirm('Открыть редактор и изменить состояние чек-листа?')){e.target.checked=!e.target.checked;return}
 edit(m.id);
 const node=$('libraryRichBody');
 if(!node)return;
 node.value=rich().toggle(node.value,Number(e.target.dataset.libraryCheckLine),e.target.checked);
 S.formDirty=true;node.dispatchEvent(new Event('input',{bubbles:true}));
}
function bindEditorMode(mode){
 cacheForm();S.mode=mode==='preview'?'preview':'write';render();
}
function switchView(view){
 if(!guardDirty())return;
 S.view=view;S.selected=null;S.panel='';S.editing=false;S.formDirty=false;render();
}
function nav(){
 let b=q('.nav [data-view="materials"]');
 if(!b){b=document.createElement('button');b.dataset.view='materials';b.textContent='▣ Материалы';const n=q('.nav');const audit=q('.nav [data-view="audit"]');
  if(audit?.parentNode)audit.parentNode.insertBefore(b,audit);else n?.appendChild(b);}
 let section=$('materials');if(!section){section=document.createElement('section');section.id='materials';section.className='view';section.innerHTML='<div id="materialsRoot"></div>';
 const audit=$('audit'),main=q('.main');if(audit?.parentNode)audit.parentNode.insertBefore(section,audit);else main?.appendChild(section);}
}
function open(){
 nav();document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='materials'));
 document.querySelectorAll('.nav [data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view==='materials'));
 if($('pageTitle'))$('pageTitle').textContent='Материалы';
 render();if(Date.now()-S.lastLoad>20000)load();
}
document.addEventListener('click',e=>{
 if(e.target.closest('.nav [data-view="materials"]')){e.preventDefault();e.stopPropagation();open();return}
 const a=e.target.closest('[data-library-view],[data-library-select],[data-library-new],[data-library-reload],[data-library-cancel],[data-library-edit],[data-library-delete],[data-library-restore],[data-library-copy],[data-library-star],[data-library-preview-file],[data-library-open-file],[data-library-external],[data-library-history],[data-library-access],[data-library-workflow],[data-library-grant],[data-library-revoke],[data-library-version-preview],[data-library-restore-version],[data-library-run-workflow],[data-library-format],[data-library-editor-mode]');
 if(!a)return;
 if(a.dataset.libraryView)switchView(a.dataset.libraryView);
 else if(a.dataset.librarySelect)select(a.dataset.librarySelect);
 else if(a.hasAttribute('data-library-new'))newMaterial();
 else if(a.hasAttribute('data-library-reload'))load();
 else if(a.hasAttribute('data-library-cancel')){if(guardDirty()){S.editing=false;S.formDirty=false;render()}}
 else if(a.dataset.libraryEdit)edit(a.dataset.libraryEdit);
 else if(a.dataset.libraryDelete)setTrash(a.dataset.libraryDelete,true);
 else if(a.dataset.libraryRestore)setTrash(a.dataset.libraryRestore,false);
 else if(a.dataset.libraryStar){const f=favorites(),id=a.dataset.libraryStar;localStorage.setItem('pt_library_favorites:'+S.id,JSON.stringify(f.includes(id)?f.filter(x=>x!==id):[...f,id]));render()}
 else if(a.dataset.libraryCopy){const m=S.items.find(x=>x.id===a.dataset.libraryCopy);if(m)navigator.clipboard.writeText(m.body||'').then(()=>toast('Текст скопирован')).catch(err=>toast(err.message,true))}
 else if(a.dataset.libraryPreviewFile)openFile(S.items.find(x=>x.id===a.dataset.libraryPreviewFile),true);
 else if(a.dataset.libraryOpenFile)openFile(S.items.find(x=>x.id===a.dataset.libraryOpenFile),false);
 else if(a.dataset.libraryExternal){const m=S.items.find(x=>x.id===a.dataset.libraryExternal);if(m&&/^https?:\/\//i.test(m.body))window.open(m.body,'_blank','noopener,noreferrer')}
 else if(a.dataset.libraryHistory)history(a.dataset.libraryHistory);
 else if(a.dataset.libraryAccess){S.panel='access';render()}
 else if(a.dataset.libraryWorkflow){S.panel='workflow';render()}
 else if(a.hasAttribute('data-library-grant'))grant();
 else if(a.dataset.libraryRevoke)revoke(a.dataset.libraryRevoke);
 else if(a.dataset.libraryVersionPreview)previewVersion(a.dataset.libraryVersionPreview);
 else if(a.dataset.libraryRestoreVersion)restoreRevision(a.dataset.libraryRestoreVersion);
 else if(a.hasAttribute('data-library-run-workflow'))runWorkflow();
 else if(a.dataset.libraryFormat){S.formDirty=true;rich()?.apply($('libraryRichBody'),a.dataset.libraryFormat)}
 else if(a.dataset.libraryEditorMode)bindEditorMode(a.dataset.libraryEditorMode);
},true);
document.addEventListener('change',e=>{
 const file=e.target.closest('[data-library-replace-file]');if(file?.files?.[0])replaceFile(file.dataset.libraryReplaceFile,file.files[0]);
 const check=e.target.closest('[data-library-check-line]');if(check&&!S.editing)previewCheck(e);
});
function tick(){
 const p=profile(),client=db(),id=p?.is_active!==false?p?.id||'':'';
 if(id===S.id&&client===S.db)return;
 S.generation++;S.db=client;S.id=id;S.items=[];S.projects=[];S.users=[];S.access=[];
 S.selected=null;S.panel='';S.editing=false;S.formDirty=false;S.lastLoad=0;S.error='';S.status='';
 nav();if(id&&$('materials')?.classList.contains('active'))load();
 else if(!id&&$('materials')?.classList.contains('active'))q('.nav [data-view="overview"]')?.click();
}
const HASH=/^#materials\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
async function openById(id){
 if(!HASH.test('#materials/'+id)||!S.id)return;
 S.view='all';S.editing=false;S.selected=id;S.panel='';
 open();
 if(!S.items.some(m=>m.id===id))await load();
 if(S.items.some(m=>m.id===id)){S.selected=id;render()}else{S.selected=null;render();toast('Материал недоступен или удалён.',true)}
}
let handled='';
function onHash(){const m=String(location.hash||'').match(HASH);if(!m||!S.id)return;const key=S.id+':'+m[1];if(key===handled)return;handled=key;openById(m[1]).catch(x=>toast(x.message,true))}
window.ProjectTrackerMaterials={openMaterialById:openById};
window.addEventListener('hashchange',onHash);
window.addEventListener('pt-workspace-context-changed',()=>queueMicrotask(onHash));
window.addEventListener('pt-workspace-context-changed',tick);
window.addEventListener('focus',tick);
window.addEventListener('online',()=>{if(S.id&&$('materials')?.classList.contains('active'))load()});
tick();queueMicrotask(onHash);
})();
