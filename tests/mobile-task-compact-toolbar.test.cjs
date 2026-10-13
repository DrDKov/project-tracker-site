const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html');
const css=read('assets/mobile-task-compact-toolbar.css');
const source=read('assets/mobile-task-compact-toolbar.js');
const done=read('assets/mobile-completed-tasks-toggle.js');
const app=read('assets/app.js');
const deploy=read('.github/scripts/apply_recurrence_scope.py');
new vm.Script(source,{filename:'mobile-task-compact-toolbar.js'});
assert.match(html,/mobile-task-compact-toolbar\.css\?v=20261013-mobile-task-controls-v1/);
assert.match(html,/assets\/app\.js\?v=20261013-mobile-task-controls-v1/);
assert.match(app,/mobile-task-compact-toolbar\.js\?v=20261013-mobile-task-controls-v1/);
assert.match(app,/mobile-completed-tasks-toggle\.js\?v=20261013-mobile-task-controls-v1/);
assert.match(deploy,/ver='20261013-mobile-task-controls-v1'/);
assert.match(css,/@media\(max-width:980px\)/);
assert.match(css,/grid-template-columns:44px 44px minmax\(0,1fr\)!important/,'Compact toolbar stays on a single row');
assert.match(css,/#tasks>\.toolbar>#taskBoardModeToggle\{display:none!important\}/,'Full mode switch not visible on mobile');
assert.match(css,/#tasks>\.toolbar>#taskSearch\{[\s\S]*?display:none!important/,'Search input stays collapsed until requested');
assert.match(css,/\.mobile-task-search-open>#taskSearch\{display:block!important\}/,'Search input can expand');
assert.match(css,/#mobileTaskFilters \.mobile-filter-body #taskShowDoneWrap/,'Completed filter lives in funnel panel');
assert.match(css,/#mobileTaskSearchBtn,#mobileTaskView\{display:none\}/,'Desktop view unchanged');
assert.match(source,/filterBody\.appendChild\(done\)/);
assert.match(source,/mode\.querySelector\('\[data-task-mode="/,'Compact view picker forwards to the existing mode handler');
assert.match(source,/\.click\(\)/);
assert.match(source,/mobile-filter-active/);
assert.match(source,/date!=='all'\|\|done\?\.checked===false/);
assert.match(done,/filterBody\.appendChild\(doneToggle\)/);
assert.doesNotMatch(done,/modeToggle\.insertAdjacentElement\('afterend', doneToggle\)/,'Done must never create an extra mobile row');
assert.doesNotMatch(source,/createElement\(['"]input['"]\)/,'No new filters are created');

function classes(){
 const values=new Set();
 return {add:s=>values.add(s),remove:s=>values.delete(s),contains:s=>values.has(s),toggle(s,enabled){if(enabled)values.add(s);else values.delete(s);return values.has(s)}};
}
const toolbar={classList:classes()};
const searchBtn={classList:classes(),innerHTML:'',attributes:{},setAttribute(k,v){this.attributes[k]=v}};
const search={value:'перезвон',attributes:{},tabIndex:0,setAttribute(k,v){this.attributes[k]=v},focus(){this.focused=true}};
const filters={removeAttribute(k){this.closed=k}};
const view={classList:classes()};
const refs={mobileTaskSearchBtn:searchBtn,taskSearch:search,mobileTaskFilters:filters,mobileTaskView:view};
const doc={
 readyState:'loading',
 addEventListener(){},
 querySelector(s){if(s==='#tasks>.toolbar')return toolbar;return null},
 getElementById(id){return refs[id]||null}
};
const win={matchMedia(){return {matches:true}},addEventListener(){}};
vm.runInNewContext(source,{document:doc,window:win,setTimeout,console});
const api=win.ProjectTrackerMobileTaskToolbar;
assert.ok(api&&typeof api.toggleSearch==='function');
api.toggleSearch(true);
assert.equal(toolbar.classList.contains('mobile-task-search-open'),true);
assert.equal(searchBtn.attributes['aria-label'],'Закрыть поиск');
assert.equal(searchBtn.attributes['aria-expanded'],'true');
assert.equal(search.focused,true);
assert.equal(filters.closed,'open','Expanding search closes the filter sheet');
api.toggleSearch(false);
assert.equal(toolbar.classList.contains('mobile-task-search-open'),false);
assert.equal(searchBtn.attributes['aria-label'],'Поиск по задачам');
assert.equal(search.value,'перезвон','Closing search retains the filter value');
assert.equal(search.tabIndex,-1,'Collapsed search is not keyboard-focusable');
assert.equal(searchBtn.classList.contains('has-search'),true,'Search icon indicates an active query');
console.log('Mobile compact controls, collapse, filter placement, view proxy and desktop isolation passed');
