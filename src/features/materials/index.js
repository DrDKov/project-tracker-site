import {
  currentProfile as getCurrentProfile,
  workspaceClient
} from '../../core/workspace-context.js';
import { canViewMaterials } from '../../core/permissions/index.js';
import {
  createFolder as createMaterialFolder,
  createMaterialSignedUrl,
  deleteMaterialFile,
  fetchMaterialProfileByCurrentUser,
  fetchMaterialsBundle,
  renameFolder as renameMaterialFolder,
  saveTemplate as saveMaterialTemplate,
  softDeleteFolder,
  softDeleteTemplate,
  uploadMaterialFile
} from '../../services/materials.service.js';

/* Feature module migrated from assets/modules/materials.js. Keep dependencies on runtime globals explicit. */
/* Workspace Materials v2: DB-backed owner detection. */
(function(){
  if(window.__WORKSPACE_MATERIALS_V2__) return;
  window.__WORKSPACE_MATERIALS_V2__ = true;

  var BUCKET='workspace-materials', WID='00000000-0000-0000-0000-000000000001';
  var S={sb:null,me:null,owner:false,tab:'templates',q:'',templates:[],folders:[],files:[],tpl:null,folder:null,edit:false,loading:false,lastCheck:0};
  function $(id){return document.getElementById(id)}
  function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function api(){return workspaceClient()}
  function prof(){return getCurrentProfile()}
  function norm(v){return String(v||'').toLowerCase().trim()}
  function dt(v){try{return v?new Date(v).toLocaleString('ru-RU'):''}catch(e){return''}}
  function bytes(n){n=Number(n||0);return n<1024?n+' Б':n<1048576?Math.round(n/1024)+' КБ':(n/1048576).toFixed(1)+' МБ'}
  function safe(n){return String(n||'file').replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]+/g,'_').replace(/\s+/g,'_').slice(0,120)}

  async function detectOwner(force){
    var sb=api(); if(!sb) return false; S.sb=sb;
    if(!force && Date.now()-S.lastCheck<3000) return S.owner;
    S.lastCheck=Date.now();
    var p=prof();
    if(p&&p.id){S.me=p;S.owner=canViewMaterials(p);return S.owner}
    try{
      var profile=await fetchMaterialProfileByCurrentUser(sb);
      if(profile){S.me=profile;S.owner=canViewMaterials(profile);return S.owner}
    }catch(e){}
    S.owner=false;return false;
  }

  function css(){
    if($('materials-css-v2'))return;
    var st=document.createElement('style');st.id='materials-css-v2';st.textContent='.materials-shell{display:grid;gap:12px}.materials-tabs{display:flex;gap:8px;flex-wrap:wrap}.materials-tab{border:1px solid #dbe4ef;background:#fff;border-radius:12px;padding:9px 13px;font-weight:900;cursor:pointer}.materials-tab.active{background:#0f172a;color:#fff;border-color:#0f172a}.materials-search{display:grid;grid-template-columns:1fr auto;gap:8px}.materials-grid,.materials-doc-layout{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:12px}.materials-list,.materials-main,.materials-search-results{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:12px;min-height:320px}.materials-row{display:block;width:100%;text-align:left;border:0;border-radius:12px;background:transparent;padding:10px;cursor:pointer;color:#0f172a}.materials-row:hover{background:#f8fafc}.materials-row.active{background:#eff6ff;color:#1d4ed8}.materials-row b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.materials-row span{display:block;font-size:12px;color:#64748b;margin-top:3px}.materials-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.materials-editor{display:grid;gap:10px}.materials-editor textarea{min-height:360px;line-height:1.45}.materials-body{white-space:pre-wrap;line-height:1.5;border:1px solid #eef2f7;border-radius:14px;background:#fbfdff;padding:14px;min-height:260px}.materials-empty{padding:20px;color:#64748b;text-align:center}.materials-file{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #eef2f7;border-radius:14px;padding:10px;margin:8px 0}.materials-file span{font-size:12px;color:#64748b}.materials-denied{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:16px;padding:16px}@media(max-width:900px){.materials-grid,.materials-doc-layout,.materials-search{grid-template-columns:1fr}}';document.head.appendChild(st)
  }

  function nav(){
    css();
    var old=document.querySelector('.nav button[data-view="materials"]');
    var view=$('materials');
    if(!S.owner){if(old)old.remove();if(view)view.remove();return}
    var n=document.querySelector('.nav'), audit=document.querySelector('.nav button[data-view="audit"]');
    if(old){old.classList.remove('hidden');old.style.display=''}
    if(n&&!old){var b=document.createElement('button');b.dataset.view='materials';b.textContent='▣ Материалы';if(audit)n.insertBefore(b,audit);else n.appendChild(b)}
    if(!view){view=document.createElement('section');view.id='materials';view.className='view';view.innerHTML='<div class="materials-shell" id="materialsRoot"></div>';var a=$('audit'), main=document.querySelector('.main');if(a&&a.parentNode)a.parentNode.insertBefore(view,a);else if(main)main.appendChild(view)}
  }

  function open(){
    if(!S.owner)return;
    qa('.view').forEach(function(x){x.classList.toggle('active',x.id==='materials')});
    qa('.nav button[data-view]').forEach(function(b){b.classList.toggle('active',b.dataset.view==='materials')});
    if($('pageTitle'))$('pageTitle').textContent='Материалы';
    if($('pageSubtitle'))$('pageSubtitle').textContent='Закрытые шаблоны и документы владельца workspace';
    render();
  }

  async function loadAll(){
    if(!S.owner||!S.sb)return;S.loading=true;render();
    var bundle=await fetchMaterialsBundle(S.sb);
    S.templates=bundle.templates||[];S.folders=bundle.folders||[];S.files=bundle.files||[];if(!S.folder&&S.folders[0])S.folder=S.folders[0].id;S.loading=false;render();
  }
  function fTemplates(){var q=norm(S.q);return q?S.templates.filter(function(t){return norm(t.title).indexOf(q)>=0||norm(t.body).indexOf(q)>=0}):S.templates}
  function fFolders(){var q=norm(S.q);return q?S.folders.filter(function(f){return norm(f.name).indexOf(q)>=0}):S.folders}
  function fFiles(){var q=norm(S.q);return q?S.files.filter(function(f){var fo=S.folders.find(function(x){return x.id===f.folder_id});return norm(f.original_name).indexOf(q)>=0||(fo&&norm(fo.name).indexOf(q)>=0)}):S.files}

  function render(){var r=$('materialsRoot');if(!r)return;if(!S.owner){r.innerHTML='<div class="materials-denied">Нет доступа</div>';return}if(S.loading){r.innerHTML='<div class="panel"><div class="materials-empty">Загружаю материалы...</div></div>';return}r.innerHTML='<div class="panel"><div class="panel-head"><div><h3>Материалы</h3><p class="muted">Закрытый раздел владельца workspace</p></div><button class="btn secondary" data-mat="reload">Обновить</button></div><div class="materials-search"><input class="input" id="materialsSearch" placeholder="Поиск по шаблонам, файлам и папкам" value="'+esc(S.q)+'"><button class="btn secondary" data-mat="clear">Сброс</button></div></div><div class="materials-tabs"><button class="materials-tab '+(S.tab==='templates'?'active':'')+'" data-tab="templates">Шаблоны</button><button class="materials-tab '+(S.tab==='documents'?'active':'')+'" data-tab="documents">Документы</button></div><div id="materialsContent"></div>';var i=$('materialsSearch');if(i)i.oninput=function(){S.q=i.value;content()};content()}
  function content(){var b=$('materialsContent');if(!b)return;if(norm(S.q))return search(b);if(S.tab==='templates')templates(b);else docs(b)}
  function search(b){var t=fTemplates(),fo=fFolders(),fi=fFiles();b.innerHTML='<div class="materials-search-results"><h4>Шаблоны</h4>'+(t.length?t.map(function(x){return row('open-template',x.id,x.title,(x.body||'').slice(0,120))}).join(''):'<div class="materials-empty">Ничего не найдено</div>')+'<h4>Папки</h4>'+(fo.length?fo.map(function(x){return row('open-folder',x.id,x.name,'Папка')}).join(''):'<div class="materials-empty">Ничего не найдено</div>')+'<h4>Файлы</h4>'+(fi.length?fi.map(function(x){return row('open-file',x.id,x.original_name,bytes(x.size_bytes)+' · '+dt(x.created_at))}).join(''):'<div class="materials-empty">Ничего не найдено</div>')+'</div>'}
  function row(act,id,title,sub,active){return'<button class="materials-row '+(active?'active':'')+'" data-mat="'+act+'" data-id="'+id+'"><b>'+esc(title)+'</b><span>'+esc(sub||'')+'</span></button>'}
  function templates(b){var list=fTemplates(),cur=S.templates.find(function(x){return x.id===S.tpl})||list[0]||null;if(cur&&!S.tpl)S.tpl=cur.id;b.innerHTML='<div class="materials-grid"><div class="materials-list"><div class="materials-actions"><button class="btn blue" data-mat="new-template">+ Создать шаблон</button></div>'+(list.length?list.map(function(x){return row('select-template',x.id,x.title,dt(x.updated_at),cur&&cur.id===x.id)}).join(''):'<div class="materials-empty">Шаблонов пока нет</div>')+'</div><div class="materials-main" id="templateMain"></div></div>';templateMain(cur)}
  function templateMain(t){var b=$('templateMain');if(!b)return;if(S.edit){var d=t||{title:'',body:''};b.innerHTML='<div class="materials-editor"><input class="input" id="templateTitle" placeholder="Название шаблона" value="'+esc(d.title)+'"><textarea class="input textarea" id="templateBody" placeholder="Текст шаблона">'+esc(d.body)+'</textarea><div class="materials-actions"><button class="btn primary" data-mat="save-template" data-id="'+esc(d.id||'')+'">Сохранить</button><button class="btn secondary" data-mat="cancel-template">Отменить</button></div></div>';return}if(!t){b.innerHTML='<div class="materials-empty">Выберите или создайте шаблон</div>';return}b.innerHTML='<div class="materials-actions"><button class="btn secondary" data-mat="edit-template" data-id="'+t.id+'">Редактировать</button><button class="btn secondary" data-mat="copy-template" data-id="'+t.id+'">Копировать текст</button><button class="btn danger" data-mat="delete-template" data-id="'+t.id+'">Удалить</button></div><h3>'+esc(t.title)+'</h3><div class="materials-body">'+esc(t.body)+'</div>'}
  function docs(b){var fs=fFolders(),cur=S.folder||(fs[0]&&fs[0].id)||null,files=S.files.filter(function(x){return cur?x.folder_id===cur:!x.folder_id});b.innerHTML='<div class="materials-doc-layout"><div class="materials-list"><div class="materials-actions"><button class="btn blue" data-mat="new-folder">+ Папка</button></div>'+(fs.length?fs.map(function(x){return row('select-folder',x.id,x.name,'Файлов: '+S.files.filter(function(f){return f.folder_id===x.id}).length,cur===x.id)}).join(''):'<div class="materials-empty">Папок пока нет</div>')+'</div><div class="materials-main"><div class="materials-actions"><button class="btn secondary" data-mat="rename-folder" data-id="'+esc(cur||'')+'" '+(!cur?'disabled':'')+'>Переименовать</button><button class="btn danger" data-mat="delete-folder" data-id="'+esc(cur||'')+'" '+(!cur?'disabled':'')+'>Удалить папку</button><label class="btn primary" style="display:inline-flex;align-items:center;cursor:pointer"><input type="file" id="materialsFileInput" style="display:none">Загрузить файл</label></div>'+(files.length?files.map(file).join(''):'<div class="materials-empty">В папке нет файлов</div>')+'</div></div>';var inp=$('materialsFileInput');if(inp)inp.onchange=function(){if(inp.files&&inp.files[0])upload(inp.files[0]).catch(err)}}
  function file(f){return'<div class="materials-file"><div><b>'+esc(f.original_name)+'</b><span>'+bytes(f.size_bytes)+' · '+dt(f.created_at)+'</span></div><div class="materials-actions"><button class="btn secondary sm" data-mat="open-file" data-id="'+f.id+'">Открыть</button><button class="btn danger sm" data-mat="delete-file" data-id="'+f.id+'">Удалить</button></div></div>'}
  function err(e){alert((e&&e.message)||String(e))}
  async function saveTemplate(id){var title=($('templateTitle')&&$('templateTitle').value||'').trim(),body=$('templateBody')&&$('templateBody').value||'';if(!title)return alert('Введите название');var r=await saveMaterialTemplate(S.sb,WID,S.me&&S.me.id,id,title,body);S.edit=false;S.tpl=r.id;await loadAll()}
  async function delTpl(id){if(!confirm('Удалить шаблон?'))return;await softDeleteTemplate(S.sb,id);S.tpl=null;await loadAll()}
  async function copyTpl(id){var t=S.templates.find(function(x){return x.id===id});if(t){await navigator.clipboard.writeText(t.body||'');alert('Текст скопирован')}}
  async function newFolder(){var n=prompt('Название папки');if(!n)return;var r=await createMaterialFolder(S.sb,WID,S.me&&S.me.id,n.trim());S.folder=r.id;await loadAll()}
  async function renFolder(id){var f=S.folders.find(function(x){return x.id===id});if(!f)return;var n=prompt('Новое название',f.name);if(!n)return;await renameMaterialFolder(S.sb,id,n.trim());await loadAll()}
  async function delFolder(id){if(!id||!confirm('Удалить папку?'))return;await softDeleteFolder(S.sb,id);S.folder=null;await loadAll()}
  async function upload(file){if(!S.folder)return alert('Сначала выберите папку');var id=crypto.randomUUID(),path=WID+'/'+S.folder+'/'+id+'_'+safe(file.name);await uploadMaterialFile(S.sb,BUCKET,WID,S.folder,S.me&&S.me.id,file,id,path);await loadAll()}
  async function openFile(id){var f=S.files.find(function(x){return x.id===id});if(!f)return;var url=await createMaterialSignedUrl(S.sb,BUCKET,f.storage_path,600);window.open(url,'_blank','noopener')}
  async function delFile(id){var f=S.files.find(function(x){return x.id===id});if(!f||!confirm('Удалить файл?'))return;await deleteMaterialFile(S.sb,BUCKET,f);await loadAll()}

  document.addEventListener('click',function(e){var nb=e.target.closest('.nav button[data-view="materials"]');if(nb){e.preventDefault();e.stopPropagation();open();return}var tab=e.target.closest('[data-tab]');if(tab){S.tab=tab.dataset.tab;render();return}var a=e.target.closest('[data-mat]');if(!a)return;var act=a.dataset.mat,id=a.dataset.id||'';if(act==='reload')loadAll().catch(err);if(act==='clear'){S.q='';render()}if(act==='new-template'){S.tpl=null;S.edit=true;content()}if(act==='select-template'){S.tpl=id;S.edit=false;content()}if(act==='open-template'){S.q='';S.tab='templates';S.tpl=id;open()}if(act==='edit-template'){S.tpl=id;S.edit=true;content()}if(act==='cancel-template'){S.edit=false;content()}if(act==='save-template')saveTemplate(id).catch(err);if(act==='delete-template')delTpl(id).catch(err);if(act==='copy-template')copyTpl(id).catch(err);if(act==='new-folder')newFolder().catch(err);if(act==='select-folder'){S.folder=id;content()}if(act==='open-folder'){S.q='';S.tab='documents';S.folder=id;open()}if(act==='rename-folder')renFolder(id).catch(err);if(act==='delete-folder')delFolder(id).catch(err);if(act==='open-file')openFile(id).catch(err);if(act==='delete-file')delFile(id).catch(err)},true);
  async function tick(){var was=S.owner;await detectOwner(false);nav();if(S.owner&&!was){loadAll().catch(err)}var active=$('materials')&&$('materials').classList.contains('active');if(active&&!S.owner){var b=document.querySelector('.nav button[data-view="tasks"],.nav button[data-view="overview"]');if(b)b.click()}}
  setInterval(tick,1000);tick();
})();
