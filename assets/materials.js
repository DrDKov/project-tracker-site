/* Workspace Materials v1: owner-only templates and documents. */
(function(){
  if(window.__WORKSPACE_MATERIALS_V1__) return;
  window.__WORKSPACE_MATERIALS_V1__ = true;

  var BUCKET = 'workspace-materials';
  var WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
  var S = { ready:false, owner:false, profile:null, sb:null, tab:'templates', q:'', templates:[], folders:[], files:[], currentTemplate:null, currentFolder:null, editing:false, loading:false };

  function $(id){ return document.getElementById(id); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function api(){ try { return window.sb || null; } catch(e){ return null; } }
  function profile(){ try { return window.currentProfile || null; } catch(e){ return null; } }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmtBytes(n){ n=Number(n||0); if(n<1024) return n+' Б'; if(n<1048576) return Math.round(n/1024)+' КБ'; return (n/1048576).toFixed(1)+' МБ'; }
  function dt(v){ try { return v ? new Date(v).toLocaleString('ru-RU') : ''; } catch(e){ return ''; } }
  function norm(v){ return String(v||'').toLowerCase().trim(); }
  function isOwner(p){ return !!(p && p.role === 'owner'); }
  function safeName(name){ return String(name||'file').replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]+/g,'_').replace(/\s+/g,'_').slice(0,120); }

  function ensureCss(){
    if($('materials-css')) return;
    var st = document.createElement('style');
    st.id = 'materials-css';
    st.textContent = '.materials-shell{display:grid;gap:12px}.materials-tabs{display:flex;gap:8px;flex-wrap:wrap}.materials-tab{border:1px solid #dbe4ef;background:#fff;border-radius:12px;padding:9px 13px;font-weight:900;cursor:pointer}.materials-tab.active{background:#0f172a;color:#fff;border-color:#0f172a}.materials-search{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.materials-grid{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:12px}.materials-list{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:10px;min-height:360px}.materials-main{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:14px;min-height:360px}.materials-row{display:block;width:100%;text-align:left;border:0;border-radius:12px;background:transparent;padding:10px;cursor:pointer;color:#0f172a}.materials-row:hover{background:#f8fafc}.materials-row.active{background:#eff6ff;color:#1d4ed8}.materials-row b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.materials-row span{display:block;font-size:12px;color:#64748b;margin-top:3px}.materials-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.materials-editor{display:grid;gap:10px}.materials-editor textarea{min-height:360px;line-height:1.45}.materials-title{font-size:18px;font-weight:900;margin:0 0 8px}.materials-body{white-space:pre-wrap;line-height:1.5;border:1px solid #eef2f7;border-radius:14px;background:#fbfdff;padding:14px;min-height:260px}.materials-empty{padding:20px;color:#64748b;text-align:center}.materials-doc-layout{display:grid;grid-template-columns:minmax(230px,300px) 1fr;gap:12px}.materials-file{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #eef2f7;border-radius:14px;padding:10px;margin:8px 0}.materials-file b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.materials-file span{font-size:12px;color:#64748b}.materials-search-results{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:12px}.materials-result-group{margin:0 0 12px}.materials-result-group h4{margin:0 0 8px}.materials-denied{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:16px;padding:16px}@media(max-width:900px){.materials-grid,.materials-doc-layout{grid-template-columns:1fr}.materials-search{grid-template-columns:1fr}}';
    document.head.appendChild(st);
  }

  function ensureNavAndView(){
    ensureCss();
    var nav = document.querySelector('.nav');
    var auditBtn = document.querySelector('.nav button[data-view="audit"]');
    var existingBtn = document.querySelector('.nav button[data-view="materials"]');
    if(S.owner){
      if(nav && !existingBtn){
        var btn = document.createElement('button');
        btn.setAttribute('data-view','materials');
        btn.textContent = '▣ Материалы';
        if(auditBtn) nav.insertBefore(btn, auditBtn); else nav.appendChild(btn);
      }
    }else if(existingBtn){ existingBtn.remove(); }

    var view = $('materials');
    if(S.owner && !view){
      view = document.createElement('section');
      view.id = 'materials';
      view.className = 'view';
      view.innerHTML = '<div class="materials-shell" id="materialsRoot"></div>';
      var audit = $('audit');
      if(audit && audit.parentNode) audit.parentNode.insertBefore(view, audit); else document.querySelector('.main') && document.querySelector('.main').appendChild(view);
    }else if(!S.owner && view){ view.remove(); }
  }

  function setMaterialsView(){
    if(!S.owner){
      var first = document.querySelector('.nav button[data-view="tasks"], .nav button[data-view="overview"]');
      if(first) first.click();
      return;
    }
    qa('.view').forEach(function(x){ x.classList.toggle('active', x.id === 'materials'); });
    qa('.nav button[data-view]').forEach(function(b){ b.classList.toggle('active', b.dataset.view === 'materials'); });
    if($('pageTitle')) $('pageTitle').textContent = 'Материалы';
    if($('pageSubtitle')) $('pageSubtitle').textContent = 'Закрытые шаблоны и документы владельца workspace';
    render();
  }

  function guardMaterialsAccess(){
    var active = $('materials') && $('materials').classList.contains('active');
    if(active && !S.owner) setMaterialsView();
  }

  async function bootstrap(){
    var sb = api(), p = profile();
    if(!sb || !p){ setTimeout(bootstrap, 700); return; }
    S.sb = sb; S.profile = p; S.owner = isOwner(p); S.ready = true;
    ensureNavAndView();
    if(S.owner) loadAll().catch(showError);
    guardMaterialsAccess();
  }

  async function loadAll(){
    if(!S.owner || !S.sb) return;
    S.loading = true;
    render();
    var tr = await S.sb.from('workspace_templates').select('*').is('deleted_at',null).order('updated_at',{ascending:false});
    if(tr.error) throw Error('Не удалось загрузить шаблоны: '+tr.error.message);
    var fr = await S.sb.from('material_folders').select('*').is('deleted_at',null).order('name',{ascending:true});
    if(fr.error) throw Error('Не удалось загрузить папки: '+fr.error.message);
    var fl = await S.sb.from('material_files').select('*').is('deleted_at',null).order('created_at',{ascending:false});
    if(fl.error) throw Error('Не удалось загрузить файлы: '+fl.error.message);
    S.templates = tr.data || [];
    S.folders = fr.data || [];
    S.files = fl.data || [];
    if(!S.currentFolder && S.folders[0]) S.currentFolder = S.folders[0].id;
    if(S.currentTemplate && !S.templates.some(function(t){return t.id===S.currentTemplate;})) S.currentTemplate = null;
    S.loading = false;
    render();
  }

  function showError(err){
    S.loading = false;
    var root = $('materialsRoot');
    if(root) root.innerHTML = '<div class="materials-denied">'+esc(err && err.message || err)+'</div>';
  }

  function filteredTemplates(){
    var q = norm(S.q);
    if(!q) return S.templates;
    return S.templates.filter(function(t){ return norm(t.title).indexOf(q)>=0 || norm(t.body).indexOf(q)>=0; });
  }
  function filteredFolders(){
    var q = norm(S.q);
    if(!q) return S.folders;
    return S.folders.filter(function(f){ return norm(f.name).indexOf(q)>=0; });
  }
  function filteredFiles(){
    var q = norm(S.q);
    if(!q) return S.files;
    return S.files.filter(function(f){ var folder=S.folders.find(function(x){return x.id===f.folder_id;}); return norm(f.original_name).indexOf(q)>=0 || (folder && norm(folder.name).indexOf(q)>=0); });
  }

  function render(){
    var root = $('materialsRoot');
    if(!root) return;
    if(!S.owner){ root.innerHTML = '<div class="materials-denied">Нет доступа к разделу.</div>'; return; }
    if(S.loading){ root.innerHTML = '<div class="panel"><div class="materials-empty">Загружаю материалы...</div></div>'; return; }
    var hasSearch = !!norm(S.q);
    root.innerHTML = '<div class="panel"><div class="panel-head"><div><h3>Материалы</h3><p class="muted">Закрытый раздел владельца workspace</p></div><button class="btn secondary" data-mat="reload">Обновить</button></div><div class="materials-search"><input class="input" id="materialsSearch" placeholder="Поиск по шаблонам, файлам и папкам" value="'+esc(S.q)+'"><button class="btn secondary" data-mat="clear-search">Сброс</button></div></div><div class="materials-tabs"><button class="materials-tab '+(S.tab==='templates'?'active':'')+'" data-mat-tab="templates">Шаблоны</button><button class="materials-tab '+(S.tab==='documents'?'active':'')+'" data-mat-tab="documents">Документы</button></div><div id="materialsContent"></div>';
    var input = $('materialsSearch');
    if(input) input.oninput = function(){ S.q = input.value; renderContent(); };
    renderContent();
  }

  function renderContent(){
    var box = $('materialsContent');
    if(!box) return;
    if(norm(S.q)){
      renderSearch(box);
      return;
    }
    if(S.tab === 'templates') renderTemplates(box); else renderDocuments(box);
  }

  function renderSearch(box){
    var tt = filteredTemplates(), ff = filteredFolders(), fl = filteredFiles();
    box.innerHTML = '<div class="materials-search-results"><div class="materials-result-group"><h4>Шаблоны</h4>'+(tt.length?tt.map(function(t){return '<button class="materials-row" data-mat="open-template" data-id="'+t.id+'"><b>'+esc(t.title)+'</b><span>'+esc((t.body||'').slice(0,120))+'</span></button>';}).join(''):'<div class="materials-empty">Ничего не найдено</div>')+'</div><div class="materials-result-group"><h4>Папки</h4>'+(ff.length?ff.map(function(f){return '<button class="materials-row" data-mat="open-folder" data-id="'+f.id+'"><b>'+esc(f.name)+'</b><span>Папка</span></button>';}).join(''):'<div class="materials-empty">Ничего не найдено</div>')+'</div><div class="materials-result-group"><h4>Файлы</h4>'+(fl.length?fl.map(function(f){return '<button class="materials-row" data-mat="open-file" data-id="'+f.id+'"><b>'+esc(f.original_name)+'</b><span>'+fmtBytes(f.size_bytes)+' · '+dt(f.created_at)+'</span></button>';}).join(''):'<div class="materials-empty">Ничего не найдено</div>')+'</div></div>';
  }

  function renderTemplates(box){
    var list = filteredTemplates();
    var current = S.templates.find(function(t){return t.id === S.currentTemplate;}) || list[0] || null;
    if(current && !S.currentTemplate) S.currentTemplate = current.id;
    box.innerHTML = '<div class="materials-grid"><div class="materials-list"><div class="materials-actions"><button class="btn blue" data-mat="new-template">+ Создать шаблон</button></div>'+(list.length?list.map(function(t){return '<button class="materials-row '+(current&&current.id===t.id?'active':'')+'" data-mat="select-template" data-id="'+t.id+'"><b>'+esc(t.title)+'</b><span>'+dt(t.updated_at)+'</span></button>';}).join(''):'<div class="materials-empty">Шаблонов пока нет</div>')+'</div><div class="materials-main" id="templateMain"></div></div>';
    renderTemplateMain(current);
  }

  function renderTemplateMain(t){
    var box = $('templateMain'); if(!box) return;
    if(!t && !S.editing){ box.innerHTML = '<div class="materials-empty">Выберите или создайте шаблон</div>'; return; }
    if(S.editing){
      var draft = t || {title:'',body:''};
      box.innerHTML = '<div class="materials-editor"><input class="input" id="templateTitle" placeholder="Название шаблона" value="'+esc(draft.title)+'"><textarea class="input textarea" id="templateBody" placeholder="Текст шаблона">'+esc(draft.body)+'</textarea><div class="materials-actions"><button class="btn primary" data-mat="save-template" data-id="'+esc(draft.id||'')+'">Сохранить</button><button class="btn secondary" data-mat="cancel-template">Отменить</button></div></div>';
      return;
    }
    box.innerHTML = '<div class="materials-actions"><button class="btn secondary" data-mat="edit-template" data-id="'+t.id+'">Редактировать</button><button class="btn secondary" data-mat="copy-template" data-id="'+t.id+'">Копировать текст</button><button class="btn danger" data-mat="delete-template" data-id="'+t.id+'">Удалить</button></div><h3 class="materials-title">'+esc(t.title)+'</h3><div class="materials-body">'+esc(t.body)+'</div>';
  }

  function renderDocuments(box){
    var folders = filteredFolders();
    var current = S.currentFolder || (folders[0] && folders[0].id) || null;
    var files = S.files.filter(function(f){ return (current ? f.folder_id === current : !f.folder_id); });
    box.innerHTML = '<div class="materials-doc-layout"><div class="materials-list"><div class="materials-actions"><button class="btn blue" data-mat="new-folder">+ Папка</button></div>'+(folders.length?folders.map(function(f){return '<button class="materials-row '+(current===f.id?'active':'')+'" data-mat="select-folder" data-id="'+f.id+'"><b>'+esc(f.name)+'</b><span>Файлов: '+S.files.filter(function(x){return x.folder_id===f.id;}).length+'</span></button>';}).join(''):'<div class="materials-empty">Папок пока нет</div>')+'</div><div class="materials-main"><div class="materials-actions"><button class="btn secondary" data-mat="rename-folder" data-id="'+esc(current||'')+'" '+(!current?'disabled':'')+'>Переименовать папку</button><button class="btn danger" data-mat="delete-folder" data-id="'+esc(current||'')+'" '+(!current?'disabled':'')+'>Удалить папку</button><label class="btn primary" style="display:inline-flex;align-items:center;cursor:pointer"><input type="file" id="materialsFileInput" style="display:none">Загрузить файл</label></div><div id="materialsFiles">'+(files.length?files.map(fileHtml).join(''):'<div class="materials-empty">В папке нет файлов</div>')+'</div></div></div>';
    var fi = $('materialsFileInput');
    if(fi) fi.onchange = function(){ if(fi.files && fi.files[0]) uploadFile(fi.files[0]).catch(showError); };
  }

  function fileHtml(f){ return '<div class="materials-file"><div><b>'+esc(f.original_name)+'</b><span>'+fmtBytes(f.size_bytes)+' · '+dt(f.created_at)+'</span></div><div class="materials-actions"><button class="btn secondary sm" data-mat="open-file" data-id="'+f.id+'">Открыть</button><button class="btn danger sm" data-mat="delete-file" data-id="'+f.id+'">Удалить</button></div></div>'; }

  async function createTemplate(){ S.currentTemplate = null; S.editing = true; renderContent(); }
  async function saveTemplate(id){
    var title = ($('templateTitle') && $('templateTitle').value || '').trim();
    var body = $('templateBody') && $('templateBody').value || '';
    if(!title) return alert('Введите название шаблона');
    var row = {workspace_id:WORKSPACE_ID,title:title,body:body,created_by:S.profile.id};
    var r = id ? await S.sb.from('workspace_templates').update({title:title,body:body}).eq('id',id).select().single() : await S.sb.from('workspace_templates').insert(row).select().single();
    if(r.error) throw Error('Не удалось сохранить шаблон: '+r.error.message);
    S.editing = false; S.currentTemplate = r.data.id; await loadAll();
  }
  async function deleteTemplate(id){ if(!confirm('Удалить шаблон?')) return; var r=await S.sb.from('workspace_templates').update({deleted_at:new Date().toISOString()}).eq('id',id); if(r.error) throw Error('Не удалось удалить шаблон: '+r.error.message); S.currentTemplate=null; await loadAll(); }
  async function copyTemplate(id){ var t=S.templates.find(function(x){return x.id===id;}); if(!t) return; await navigator.clipboard.writeText(t.body||''); alert('Текст скопирован'); }

  async function createFolder(){ var name=prompt('Название папки'); if(!name) return; var r=await S.sb.from('material_folders').insert({workspace_id:WORKSPACE_ID,name:name.trim(),created_by:S.profile.id}).select().single(); if(r.error) throw Error('Не удалось создать папку: '+r.error.message); S.currentFolder=r.data.id; await loadAll(); }
  async function renameFolder(id){ var f=S.folders.find(function(x){return x.id===id;}); if(!f) return; var name=prompt('Новое название папки',f.name); if(!name) return; var r=await S.sb.from('material_folders').update({name:name.trim()}).eq('id',id); if(r.error) throw Error('Не удалось переименовать папку: '+r.error.message); await loadAll(); }
  async function deleteFolder(id){ if(!id || !confirm('Удалить папку? Файлы останутся без папки.')) return; var r=await S.sb.from('material_folders').update({deleted_at:new Date().toISOString()}).eq('id',id); if(r.error) throw Error('Не удалось удалить папку: '+r.error.message); S.currentFolder=null; await loadAll(); }
  async function uploadFile(file){
    if(!S.currentFolder) return alert('Сначала создайте или выберите папку');
    var fileId = crypto.randomUUID();
    var path = WORKSPACE_ID + '/' + S.currentFolder + '/' + fileId + '_' + safeName(file.name);
    var up = await S.sb.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(up.error) throw Error('Не удалось загрузить файл: '+up.error.message);
    var r = await S.sb.from('material_files').insert({id:fileId,workspace_id:WORKSPACE_ID,folder_id:S.currentFolder,original_name:file.name,storage_path:path,mime_type:file.type||null,size_bytes:file.size,created_by:S.profile.id}).select().single();
    if(r.error){ await S.sb.storage.from(BUCKET).remove([path]); throw Error('Не удалось сохранить метаданные файла: '+r.error.message); }
    await loadAll();
  }
  async function openFile(id){ var f=S.files.find(function(x){return x.id===id;}); if(!f) return; var r=await S.sb.storage.from(BUCKET).createSignedUrl(f.storage_path,60*10); if(r.error) throw Error('Не удалось открыть файл: '+r.error.message); window.open(r.data.signedUrl,'_blank','noopener'); }
  async function deleteFile(id){ var f=S.files.find(function(x){return x.id===id;}); if(!f || !confirm('Удалить файл?')) return; await S.sb.storage.from(BUCKET).remove([f.storage_path]); var r=await S.sb.from('material_files').update({deleted_at:new Date().toISOString()}).eq('id',id); if(r.error) throw Error('Не удалось удалить файл: '+r.error.message); await loadAll(); }

  document.addEventListener('click',function(e){
    var nav = e.target.closest('.nav button[data-view="materials"]');
    if(nav){ e.preventDefault(); e.stopPropagation(); setMaterialsView(); return; }
    var tab = e.target.closest('[data-mat-tab]');
    if(tab){ S.tab = tab.dataset.matTab; render(); return; }
    var a = e.target.closest('[data-mat]');
    if(!a) return;
    var act = a.dataset.mat, id = a.dataset.id || '';
    try{
      if(act==='reload') loadAll().catch(showError);
      if(act==='clear-search'){ S.q=''; render(); }
      if(act==='new-template') createTemplate();
      if(act==='select-template'){ S.currentTemplate=id; S.editing=false; renderContent(); }
      if(act==='open-template'){ S.tab='templates'; S.currentTemplate=id; S.q=''; setMaterialsView(); }
      if(act==='edit-template'){ S.currentTemplate=id; S.editing=true; renderContent(); }
      if(act==='cancel-template'){ S.editing=false; renderContent(); }
      if(act==='save-template') saveTemplate(id).catch(showError);
      if(act==='delete-template') deleteTemplate(id).catch(showError);
      if(act==='copy-template') copyTemplate(id).catch(showError);
      if(act==='new-folder') createFolder().catch(showError);
      if(act==='select-folder'){ S.currentFolder=id; renderContent(); }
      if(act==='open-folder'){ S.tab='documents'; S.currentFolder=id; S.q=''; setMaterialsView(); }
      if(act==='rename-folder') renameFolder(id).catch(showError);
      if(act==='delete-folder') deleteFolder(id).catch(showError);
      if(act==='open-file') openFile(id).catch(showError);
      if(act==='delete-file') deleteFile(id).catch(showError);
    }catch(err){ showError(err); }
  },true);

  setInterval(function(){
    var p = profile();
    var ownerNow = isOwner(p);
    if(p && (!S.ready || ownerNow !== S.owner || (S.profile && S.profile.id !== p.id))){
      S.profile = p; S.owner = ownerNow; S.sb = api(); S.ready = true; ensureNavAndView(); if(S.owner && !S.templates.length && !S.loading) loadAll().catch(showError);
    }
    guardMaterialsAccess();
  },1000);

  bootstrap();
})();
