import re
import runpy
from pathlib import Path

script = Path('.github/scripts/apply_task_links.py')
if not script.exists():
    raise SystemExit('apply_task_links.py not found')

src = script.read_text(encoding='utf-8')
src = re.sub(r"\nif old\.exists\(\):\n    .+?\nJS=r'''", "\nJS=r'''", src, count=1, flags=re.S)
tmp = Path('.github/scripts/_apply_task_links_norecur.py')
tmp.write_text(src, encoding='utf-8')
try:
    runpy.run_path(str(tmp), run_name='__main__')
finally:
    if tmp.exists():
        tmp.unlink()

app = Path('assets/app.js')
if app.exists():
    s = app.read_text(encoding='utf-8')
    s = re.sub(r"/\* Task links layout and recurrence scope fix v[12] start \*/[\s\S]*?/\* Task links layout and recurrence scope fix v[12] end \*/\n?", "", s)
    fix = r'''
/* Task links layout and recurrence scope fix v2 start */
(function(){
  if(window.__TASK_LINKS_LAYOUT_SCOPE_FIX_V2__) return;
  window.__TASK_LINKS_LAYOUT_SCOPE_FIX_V2__ = true;
  var currentSeriesTask = null;
  function $(id){ return document.getElementById(id); }
  function qa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function sb(){ return window.sb || null; }
  function tasks(){ return Array.isArray(window.tasks) ? window.tasks : []; }
  function ymd(v){ return String(v || '').slice(0,10); }
  function taskId(){ return $('taskId') ? $('taskId').value : ''; }
  function domSaysSeries(){
    var note = $('taskRepeatExistingNote');
    return !!(note && /экземпляр повторяющейся задачи|повторяющейся задачи/i.test(note.textContent || ''));
  }
  function localTask(){
    var id = taskId();
    return tasks().find(function(t){ return t && t.id === id; }) || currentSeriesTask;
  }
  async function fetchCurrentTask(){
    var id = taskId();
    if(!id || !sb()) return null;
    if(currentSeriesTask && currentSeriesTask.id === id) return currentSeriesTask;
    try{
      var r = await sb().from('tasks').select('id,recurrence_rule_id,recurrence_date,start_date,due_date').eq('id', id).single();
      if(!r.error && r.data){ currentSeriesTask = r.data; return r.data; }
    }catch(e){}
    return null;
  }
  function ensureStyle(){
    if($('task-links-layout-scope-css')) return;
    var st = document.createElement('style');
    st.id = 'task-links-layout-scope-css';
    st.textContent = '.task-recurrence-scope{border:1px solid #dbe4ef;border-radius:14px;background:#fff;padding:12px;display:grid;gap:8px;margin-top:10px}.task-recurrence-scope.hidden{display:none!important}.task-recurrence-scope label{display:flex;align-items:center;gap:8px;font-size:13px}.task-recurrence-scope small{color:#64748b;line-height:1.35}.task-links-box{margin-top:10px!important}';
    document.head.appendChild(st);
  }
  function ensureSingleScopeBox(){
    ensureStyle();
    var recur = document.querySelector('.task-recurrence-box');
    if(!recur || !recur.parentNode) return null;
    var boxes = qa('#taskRecurrenceScopeBox');
    var box = boxes[0] || null;
    boxes.slice(1).forEach(function(x){ x.remove(); });
    if(!box){
      box = document.createElement('div');
      box.id = 'taskRecurrenceScopeBox';
      box.className = 'full task-recurrence-scope hidden';
      box.innerHTML = '<b>Применить изменения</b><label><input type="radio" name="taskRecurrenceScope" value="one" checked> Только эту задачу</label><label><input type="radio" name="taskRecurrenceScope" value="all"> Все задачи этой серии</label><label><input type="radio" name="taskRecurrenceScope" value="future"> Эту и будущие задачи серии</label><small id="taskRecurrenceScopeHint">Даты экземпляров серии не переносятся; меняются общие поля и время.</small>';
    }
    if(box.parentNode !== recur.parentNode || box.previousElementSibling !== recur){
      recur.parentNode.insertBefore(box, recur.nextSibling);
    }
    return box;
  }
  function placeLinksBox(){
    var links = $('taskLinksBox');
    var recur = document.querySelector('.task-recurrence-box');
    if(!links || !recur || !recur.parentNode) return;
    var box = ensureSingleScopeBox();
    var anchor = box && !box.classList.contains('hidden') ? box : recur;
    if(links.parentNode !== anchor.parentNode || links.previousElementSibling !== anchor){
      anchor.parentNode.insertBefore(links, anchor.nextSibling);
    }
  }
  function showScope(t){
    var box = ensureSingleScopeBox();
    if(!box) return;
    var isSeries = !!(domSaysSeries() || (t && t.recurrence_rule_id));
    box.classList.toggle('hidden', !isSeries);
    if(!isSeries) return;
    var id = taskId();
    if(box.dataset.taskId !== id){
      box.dataset.taskId = id;
      qa('input[name="taskRecurrenceScope"]').forEach(function(r){ r.checked = r.value === 'one'; });
    }
    var hint = $('taskRecurrenceScopeHint');
    if(!hint) return;
    if(t && t.recurrence_rule_id){
      var all = tasks().filter(function(x){ return x && !x.deleted_at && x.recurrence_rule_id === t.recurrence_rule_id; });
      var base = ymd(t.recurrence_date || t.start_date || t.due_date);
      var future = all.filter(function(x){ return ymd(x.recurrence_date || x.start_date || x.due_date) >= base; });
      hint.textContent = all.length ? ('Серия: ' + all.length + ' задач. Эта и будущие: ' + future.length + '. Даты экземпляров не переносятся.') : 'Можно применить изменения только к этой задаче, ко всей серии или к этой и будущим задачам серии.';
    }else{
      hint.textContent = 'Можно применить изменения только к этой задаче, ко всей серии или к этой и будущим задачам серии.';
    }
  }
  function scopeValue(){ var r = qa('input[name="taskRecurrenceScope"]').find(function(x){ return x.checked; }); return r ? r.value : 'one'; }
  function readRow(){
    return {
      title: $('taskTitle') ? $('taskTitle').value.trim() : '',
      project_id: $('taskProject') ? $('taskProject').value : null,
      notes: $('taskNotes') ? ($('taskNotes').value || null) : null,
      status: $('taskStatus') ? $('taskStatus').value : 'planned',
      priority: $('taskPriority') ? $('taskPriority').value : 'medium',
      assignee_id: $('taskAssignee') ? ((Array.prototype.slice.call($('taskAssignee').selectedOptions).map(function(o){return o.value;}).filter(Boolean)[0]) || null) : null,
      start_time: $('taskStartTime') ? ($('taskStartTime').value || null) : null,
      end_time: $('taskEndTime') ? ($('taskEndTime').value || null) : null,
      duration_minutes: $('taskDurationMinutes') && $('taskDurationMinutes').value ? Number($('taskDurationMinutes').value) : null,
      is_all_day: $('taskAllDay') ? !!$('taskAllDay').checked : false
    };
  }
  async function idsForSeries(t, selected){
    if(!t || !t.recurrence_rule_id || !sb()) return [];
    var base = ymd(t.recurrence_date || t.start_date || t.due_date);
    var q = sb().from('tasks').select('id,recurrence_date,start_date,due_date,deleted_at').eq('recurrence_rule_id', t.recurrence_rule_id);
    var r = await q;
    if(r.error) throw new Error(r.error.message);
    var rows = (r.data || []).filter(function(x){ return !x.deleted_at; });
    if(selected === 'future') rows = rows.filter(function(x){ return ymd(x.recurrence_date || x.start_date || x.due_date) >= base; });
    return rows.map(function(x){ return x.id; }).filter(Boolean);
  }
  async function saveSeriesIfNeeded(e){
    if(scopeValue() === 'one') return;
    var t = localTask() || await fetchCurrentTask();
    if(!t || !t.recurrence_rule_id || !sb()) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    var row = readRow();
    if(!row.title) return alert('Введите название задачи');
    var ids;
    try{ ids = await idsForSeries(t, scopeValue()); }catch(err){ return alert(err.message || String(err)); }
    if(!ids.length) return alert('Не найдены задачи серии');
    var r = await sb().from('tasks').update(row).in('id', ids).select('id');
    if(r.error) return alert(r.error.message);
    var m = $('taskModal'); if(m && m.close) m.close();
    if(typeof window.load === 'function') window.load(); else location.reload();
  }
  async function tick(){
    var modal = $('taskModal');
    if(!modal || !modal.open) return;
    var t = localTask();
    if(domSaysSeries() && (!t || !t.recurrence_rule_id)) t = await fetchCurrentTask();
    showScope(t);
    placeLinksBox();
  }
  document.addEventListener('submit', function(e){ if(e.target && e.target.id === 'taskForm') saveSeriesIfNeeded(e); }, true);
  document.addEventListener('change', function(){ setTimeout(tick, 60); }, true);
  var mo = new MutationObserver(function(){ setTimeout(tick, 60); });
  if(document.body) mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class','style']});
  [0,100,300,800,1500,3000].forEach(function(ms){ setTimeout(tick, ms); });
})();
/* Task links layout and recurrence scope fix v2 end */
'''
    s = s.rstrip() + '\n\n' + fix + '\n'
    app.write_text(s, encoding='utf-8')
