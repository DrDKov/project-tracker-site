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
    s = re.sub(r"/\* Task links layout and recurrence scope fix v1 start \*/[\s\S]*?/\* Task links layout and recurrence scope fix v1 end \*/\n?", "", s)
    fix = r'''
/* Task links layout and recurrence scope fix v1 start */
(function(){
  if(window.__TASK_LINKS_LAYOUT_SCOPE_FIX_V1__) return;
  window.__TASK_LINKS_LAYOUT_SCOPE_FIX_V1__ = true;
  function $(id){ return document.getElementById(id); }
  function qa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function tasks(){ return Array.isArray(window.tasks) ? window.tasks : []; }
  function sb(){ return window.sb || null; }
  function task(){ var id = $('taskId') ? $('taskId').value : ''; return tasks().find(function(t){ return t && t.id === id; }) || null; }
  function ymd(v){ return String(v || '').slice(0,10); }
  function ensureStyle(){
    if($('task-links-layout-scope-css')) return;
    var st = document.createElement('style');
    st.id = 'task-links-layout-scope-css';
    st.textContent = '.task-recurrence-scope{border:1px solid #dbe4ef;border-radius:14px;background:#fff;padding:12px;display:grid;gap:8px;margin-top:10px}.task-recurrence-scope.hidden{display:none!important}.task-recurrence-scope label{display:flex;align-items:center;gap:8px;font-size:13px}.task-recurrence-scope small{color:#64748b;line-height:1.35}.task-links-box{margin-top:10px!important}';
    document.head.appendChild(st);
  }
  function ensureScopeBox(){
    ensureStyle();
    var recur = document.querySelector('.task-recurrence-box');
    if(!recur || !recur.parentNode) return null;
    var box = $('taskRecurrenceScopeBox');
    if(!box){
      box = document.createElement('div');
      box.id = 'taskRecurrenceScopeBox';
      box.className = 'full task-recurrence-scope hidden';
      box.innerHTML = '<b>Применить изменения</b><label><input type="radio" name="taskRecurrenceScope" value="one" checked> Только эту задачу</label><label><input type="radio" name="taskRecurrenceScope" value="all"> Все задачи этой серии</label><label><input type="radio" name="taskRecurrenceScope" value="future"> Эту и будущие задачи серии</label><small id="taskRecurrenceScopeHint">Даты экземпляров серии не переносятся; меняются общие поля и время.</small>';
      recur.parentNode.insertBefore(box, recur.nextSibling);
    }
    return box;
  }
  function syncScopeBox(){
    var t = task(), box = ensureScopeBox();
    if(!box) return;
    var isSeries = !!(t && t.recurrence_rule_id);
    box.classList.toggle('hidden', !isSeries);
    if(!isSeries) return;
    if(box.dataset.taskId !== t.id){
      box.dataset.taskId = t.id;
      qa('input[name="taskRecurrenceScope"]').forEach(function(r){ r.checked = r.value === 'one'; });
    }
    var all = tasks().filter(function(x){ return x && !x.deleted_at && x.recurrence_rule_id === t.recurrence_rule_id; });
    var base = ymd(t.recurrence_date || t.start_date || t.due_date);
    var future = all.filter(function(x){ return ymd(x.recurrence_date || x.start_date || x.due_date) >= base; });
    var hint = $('taskRecurrenceScopeHint');
    if(hint) hint.textContent = 'Серия: ' + all.length + ' задач. Эта и будущие: ' + future.length + '. Даты экземпляров не переносятся.';
  }
  function placeLinksBox(){
    var links = $('taskLinksBox');
    var recur = document.querySelector('.task-recurrence-box');
    if(!links || !recur || !recur.parentNode) return;
    syncScopeBox();
    var scope = $('taskRecurrenceScopeBox');
    var anchor = scope && !scope.classList.contains('hidden') ? scope : recur;
    if(links.parentNode !== anchor.parentNode || links.previousElementSibling !== anchor){
      anchor.parentNode.insertBefore(links, anchor.nextSibling);
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
  async function saveSeriesIfNeeded(e){
    var t = task();
    if(!t || !t.recurrence_rule_id || scopeValue() === 'one' || !sb()) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    var selected = scopeValue();
    var base = ymd(t.recurrence_date || t.start_date || t.due_date);
    var rows = tasks().filter(function(x){ return x && !x.deleted_at && x.recurrence_rule_id === t.recurrence_rule_id; });
    if(selected === 'future') rows = rows.filter(function(x){ return ymd(x.recurrence_date || x.start_date || x.due_date) >= base; });
    var ids = rows.map(function(x){ return x.id; }).filter(Boolean);
    if(!ids.length) return alert('Не найдены задачи серии');
    var row = readRow();
    if(!row.title) return alert('Введите название задачи');
    var r = await sb().from('tasks').update(row).in('id', ids).select('id');
    if(r.error) return alert(r.error.message);
    var m = $('taskModal'); if(m && m.close) m.close();
    if(typeof window.load === 'function') window.load(); else location.reload();
  }
  document.addEventListener('submit', function(e){ if(e.target && e.target.id === 'taskForm') saveSeriesIfNeeded(e); }, true);
  document.addEventListener('change', function(e){ if(e.target && e.target.name === 'taskRecurrenceScope') return; setTimeout(function(){ syncScopeBox(); placeLinksBox(); }, 50); }, true);
  function tick(){ syncScopeBox(); placeLinksBox(); }
  var mo = new MutationObserver(function(){ setTimeout(tick, 50); });
  if(document.body) mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class','style']});
  [0,100,300,800,1500,3000].forEach(function(ms){ setTimeout(tick, ms); });
})();
/* Task links layout and recurrence scope fix v1 end */
'''
    s = s.rstrip() + '\n\n' + fix + '\n'
    app.write_text(s, encoding='utf-8')
