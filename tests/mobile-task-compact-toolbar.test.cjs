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
const layout=read('assets/workspace-layout.js');
new vm.Script(source,{filename:'mobile-task-compact-toolbar.js'});
assert.match(html,/mobile-task-compact-toolbar\.css\?v=20261013-mobile-task-toolbar-v3/);
assert.match(html,/assets\/app\.js\?v=20261013-mobile-task-toolbar-v3/);
assert.match(app,/mobile-task-compact-toolbar\.js\?v=20261013-mobile-task-toolbar-v3/);
assert.match(app,/mobile-completed-tasks-toggle\.js\?v=20261013-mobile-task-controls-v1/);
assert.match(deploy,/ver='20261013-mobile-task-toolbar-v3'/);
assert.match(css,/@media\(max-width:980px\)/);
assert.match(layout,/if\(summary && !summary\.closest\('#mobileTaskCompactBar'\)\)/,'Layout sync must not replace the funnel SVG with text');
assert.match(css,/UNIFIED MOBILE TASK CONTROLS/);
assert.match(html,/mobile-task-compact-toolbar\.css\?v=20261013-mobile-task-toolbar-v3-native-calendar-v1/);
assert.match(html,/assets\/app\.js\?v=20261013-mobile-task-toolbar-v3-native-calendar-v2/);
assert.match(app,/mobile-task-compact-toolbar\.js\?v=20261013-mobile-task-toolbar-v3-native-calendar-v2/);
assert.match(deploy,/ver\+'-native-calendar-v2'/,'Deployment must preserve the native calendar cache revision');
assert.match(css,/SINGLE-ROW TASK COMMAND AND DAY NAVIGATION/);

const layoutScript=read('assets/workspace-layout.js');
assert.match(html,/id='compactNativeDate' class='mobile-native-date-input'/,'Use a direct date input over the day label');
assert.match(html,/pager.querySelector\('#compactNativeDate'\)\.addEventListener\('change'/,'Choosing a native date navigates to that day');
assert.match(html,/nativeDate\.disabled=!isWeek/,'Native calendar only activates for week mode');
assert.match(css,/mobile-column-date-anchor>\.mobile-native-date-input\{[\s\S]*?position:absolute!important;inset:0!important;z-index:5!important/,'Native input overlays date button for direct iOS touch');
assert.doesNotMatch(layoutScript,/compactDateDialog|dialog\.showModal\(\)/,'No intermediary date modal');
assert.match(layoutScript,/input\.showPicker\(\)/,'Keyboard date activation opens browser-native picker');
assert.match(source,/window\.ProjectTrackerColumns\?\.selectDate\('__none__'\)/,'Keep undated tasks reachable through filters');

assert.match(css,/#mobileTaskCompactBar>#mobileColumnPager:not\(\[hidden\]\)\{[\s\S]*?grid-template-columns:30px minmax\(0,1fr\) 30px 65px!important/);
assert.match(css,/@media\(max-width:350px\)\{[\s\S]*?grid-template-columns:28px minmax\(0,1fr\) 28px 34px!important/,'On narrow screens the Today action collapses to an icon');
assert.match(css,/#mobileTaskCompactBar\.mobile-task-search-open>#mobileColumnPager\{[\s\S]*?display:none!important/,'Search must retain one row without crowding');
assert.match(source,/function placePager\(bar,toolbar,mode\)/);
assert.match(source,/if\(pager.parentElement!==bar\)bar.appendChild\(pager\)/,'Actual day pager is moved into the control row');
assert.match(source,/if\(week\)week.insertAdjacentElement\('afterend',pager\)/,'Desktop restores the existing pager');
for(const viewport of [320,360,375,390,402]){
  const narrow=viewport<=374, tiny=viewport<=350;
  const icons=narrow?34:38, gap=narrow?4:6;
  const navButtons=narrow?28:30, today=tiny?34:narrow?64:65;
  const navGaps=narrow?3:4;
  const dateWidth=viewport-28-(3*icons+3*gap)-(2*navButtons+today+3*navGaps);
  assert.ok(dateWidth>=70,'Date must fit on a '+viewport+'px screen, got '+dateWidth+'px');
}

assert.match(css,/#mobileTaskCompactBar>#mobileTaskSearchBtn,\s*body #tasks #mobileTaskCompactBar>#mobileTaskFilters,\s*body #tasks #mobileTaskCompactBar>#mobileTaskView\{[\s\S]*?flex:0 0 44px!important/,'Search, filter and view controls share equal dimensions');
assert.match(css,/#mobileTaskViewBtn \.mobile-task-view-label,\s*body #tasks #mobileTaskCompactBar #mobileTaskViewBtn \.mobile-task-chevron\{[\s\S]*?display:none!important/,'View control is compact and icon-only');

assert.match(css,/#mobileTaskCompactBar\{display:none\}/,'Desktop does not show mobile controls');
assert.match(css,/#tasks>\.toolbar>#mobileTaskCompactBar\{[\s\S]*?display:flex!important/,'Mobile controls use an isolated flex row');
assert.match(css,/#tasks>\.toolbar>:not\(#mobileTaskCompactBar\):not\(#mobileColumnPager\)/,'Obsolete controls never occupy extra rows');
assert.match(css,/#tasks>\.toolbar>#taskWeekNav\.mobile-week-visible/,'Duplicate week navigation hidden');
assert.match(css,/#tasks>\.toolbar>#taskBoardModeToggle/,'Original mode switch hidden on mobile');
assert.match(css,/#mobileTaskCompactBar>#taskSearch\{[\s\S]*?display:none!important/,'Search input stays collapsed until requested');
assert.match(css,/#mobileTaskCompactBar\.mobile-task-search-open>#taskSearch\{[\s\S]*?display:block!important/,'Search input can expand');
assert.match(css,/#mobileTaskFilters \.mobile-filter-body #taskShowDoneWrap/,'Completed filter lives in funnel panel');
assert.match(css,/#mobileTaskCompactBar\{display:none\}/,'Desktop view unchanged');
assert.match(source,/bar\.appendChild\(filter\)/,'Filter details moved into the compact control bar');
assert.match(source,/bar\.appendChild\(view\)/,'View selector moved into the same bar');
assert.match(source,/bar\.insertBefore\(search,searchBtn\)/,'Search field opens inside this bar');
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
