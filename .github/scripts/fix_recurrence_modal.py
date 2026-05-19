from pathlib import Path
import re

ROOT = Path('.')
RUNTIME = ROOT / 'assets/app-runtime.js'
INDEX = ROOT / 'index.html'
CSS = ROOT / 'assets/app.css'
APP = ROOT / 'assets/app.js'

REC_BLOCK_HTML = """<div class='full task-recurrence-box'><label class='task-recurrence-head'><input id='taskRepeatEnabled' type='checkbox'> <span>Повторяющаяся задача</span></label><div id='taskRepeatOptions' class='task-repeat-options hidden'><label><span>Тип повторения</span><select class='input' id='taskRepeatType'><option value='daily'>Ежедневно</option><option value='weekdays'>По дням недели</option><option value='weekly'>Раз в неделю</option><option value='monthly'>Раз в месяц</option></select></label><label><span>Повторять до</span><input class='input' id='taskRepeatUntil' type='date'></label><div id='taskRepeatWeekdaysBox' class='task-repeat-weekdays full hidden'><label><input class='task-repeat-weekday' type='checkbox' value='1'>Пн</label><label><input class='task-repeat-weekday' type='checkbox' value='2'>Вт</label><label><input class='task-repeat-weekday' type='checkbox' value='3'>Ср</label><label><input class='task-repeat-weekday' type='checkbox' value='4'>Чт</label><label><input class='task-repeat-weekday' type='checkbox' value='5'>Пт</label><label><input class='task-repeat-weekday' type='checkbox' value='6'>Сб</label><label><input class='task-repeat-weekday' type='checkbox' value='7'>Вс</label></div></div><div id='taskRepeatExistingNote' class='task-repeat-existing-note'></div></div>"""

RECURRENCE_JS = r'''
/* Task recurrence v2 start */
function ensureTaskRecurrenceUi(){
  if($('taskRepeatEnabled'))return;
  let due=$('taskDue'),grid=due&&due.closest?due.closest('.form-grid'):null;
  if(!due||!grid)return;
  let wrap=document.createElement('div');
  wrap.className='full task-recurrence-box';
  wrap.innerHTML='<label class="task-recurrence-head"><input id="taskRepeatEnabled" type="checkbox"> <span>Повторяющаяся задача</span></label><div id="taskRepeatOptions" class="task-repeat-options hidden"><label><span>Тип повторения</span><select class="input" id="taskRepeatType"><option value="daily">Ежедневно</option><option value="weekdays">По дням недели</option><option value="weekly">Раз в неделю</option><option value="monthly">Раз в месяц</option></select></label><label><span>Повторять до</span><input class="input" id="taskRepeatUntil" type="date"></label><div id="taskRepeatWeekdaysBox" class="task-repeat-weekdays full hidden"><label><input class="task-repeat-weekday" type="checkbox" value="1">Пн</label><label><input class="task-repeat-weekday" type="checkbox" value="2">Вт</label><label><input class="task-repeat-weekday" type="checkbox" value="3">Ср</label><label><input class="task-repeat-weekday" type="checkbox" value="4">Чт</label><label><input class="task-repeat-weekday" type="checkbox" value="5">Пт</label><label><input class="task-repeat-weekday" type="checkbox" value="6">Сб</label><label><input class="task-repeat-weekday" type="checkbox" value="7">Вс</label></div></div><div id="taskRepeatExistingNote" class="task-repeat-existing-note"></div>';
  let dueLabel=due.closest('label');
  if(dueLabel&&dueLabel.parentNode)dueLabel.parentNode.insertBefore(wrap,dueLabel.nextSibling);else grid.appendChild(wrap);
}
function recurrenceWeekdayNumber(dateStr){let day=D(dateStr).getDay();return day===0?7:day}
function recurrenceLastDayOfMonth(year,monthIndex){return new Date(year,monthIndex+1,0).getDate()}
function recurrenceAddMonthsClamped(dateStr,months,anchorDay){let d=D(dateStr),y=d.getFullYear(),m=d.getMonth()+months,ny=y+Math.floor(m/12),nm=((m%12)+12)%12,day=Math.min(anchorDay||d.getDate(),recurrenceLastDayOfMonth(ny,nm));return ymd(new Date(ny,nm,day))}
function generateRecurrenceDates(rule){let type=rule.repeat_type,start=rule.start_date,until=rule.repeat_until,days=(rule.weekdays||[]).map(Number).filter(x=>x>=1&&x<=7),out=[];if(!start||!until)return out;if(until<start)return out;if(type==='daily'){for(let d=start;d<=until;d=add(d,1))out.push(d)}else if(type==='weekdays'){let set=new Set(days);if(!set.size)throw Error('Выберите дни недели для повторения');for(let d=start;d<=until;d=add(d,1))if(set.has(recurrenceWeekdayNumber(d)))out.push(d)}else if(type==='weekly'){for(let d=start;d<=until;d=add(d,7))out.push(d)}else if(type==='monthly'){let anchor=D(start).getDate();for(let i=0,d=start;d<=until;i++,d=recurrenceAddMonthsClamped(start,i,anchor))out.push(d)}else throw Error('Неизвестный тип повторения');if(out.length>370)throw Error('Слишком много повторений: максимум 370 задач');return out}
function taskRecurrenceWeekdays(){ensureTaskRecurrenceUi();return qa('.task-repeat-weekday:checked').map(x=>Number(x.value)).filter(x=>x>=1&&x<=7)}
function taskRecurrenceEnabled(){ensureTaskRecurrenceUi();return !!$('taskRepeatEnabled')?.checked}
function syncTaskRecurrenceUi(){ensureTaskRecurrenceUi();let enabled=taskRecurrenceEnabled(),type=$('taskRepeatType')?.value||'daily',box=$('taskRepeatOptions'),week=$('taskRepeatWeekdaysBox'),until=$('taskRepeatUntil');if(box)box.classList.toggle('hidden',!enabled);if(week)week.classList.toggle('hidden',!(enabled&&type==='weekdays'));if($('taskRepeatType'))$('taskRepeatType').disabled=!enabled;if(until)until.disabled=!enabled;qa('.task-repeat-weekday').forEach(x=>x.disabled=!enabled||type!=='weekdays')}
function setupTaskRecurrenceFields(task,id){ensureTaskRecurrenceUi();let en=$('taskRepeatEnabled');if(!en)return;let existing=!!id;en.checked=false;en.disabled=existing;if($('taskRepeatType')){$('taskRepeatType').value='daily';$('taskRepeatType').disabled=true}if($('taskRepeatUntil')){$('taskRepeatUntil').value='';$('taskRepeatUntil').disabled=true}qa('.task-repeat-weekday').forEach(x=>{x.checked=false;x.disabled=true});let note=$('taskRepeatExistingNote');if(note){note.textContent=existing&&task?.recurrence_rule_id?'Это экземпляр повторяющейся задачи. Изменения применяются только к этой задаче.':existing?'Повторение доступно только при создании новой задачи.':''}syncTaskRecurrenceUi()}
async function createRecurringTasks(baseRow,selected){let start=baseRow.start_date||baseRow.due_date,until=$('taskRepeatUntil')?.value||'',type=$('taskRepeatType')?.value||'daily',weekdays=type==='weekdays'?taskRecurrenceWeekdays():null;if(!start)throw Error('Для повторяющейся задачи укажите дату старта');if(!until)throw Error('Для повторяющейся задачи укажите дату окончания повторения');if(until<start)throw Error('Дата окончания повторения не может быть раньше даты старта');let durationDays=(baseRow.start_date&&baseRow.due_date)?Math.max(0,diff(baseRow.start_date,baseRow.due_date)):0;let ruleDraft={source_task_id:null,project_id:baseRow.project_id,title:baseRow.title,notes:baseRow.notes||null,status:'planned',priority:baseRow.priority||'medium',assignee_id:selected[0]||null,repeat_type:type,weekdays,repeat_until:until,start_date:start,due_date:baseRow.due_date||start,created_by:S.profile?.id||null};let dates=generateRecurrenceDates(ruleDraft);if(!dates.length)throw Error('По заданным условиям нет дат повторения');let rr=await S.sb.from('task_recurrence_rules').insert(ruleDraft).select().single();if(rr.error)throw Error(rr.error.message);let ruleId=rr.data.id;let rows=dates.map((d,i)=>({project_id:baseRow.project_id,title:baseRow.title,notes:baseRow.notes||null,status:'planned',priority:baseRow.priority||'medium',start_date:d,due_date:add(d,durationDays),assignee_id:selected[0]||null,sort_order:i,is_favorite:false,recurrence_rule_id:ruleId,recurrence_date:d}));let ins=await S.sb.from('tasks').upsert(rows,{onConflict:'recurrence_rule_id,recurrence_date'}).select('id,recurrence_date');if(ins.error)throw Error(ins.error.message);if(ins.data?.[0]?.id)await S.sb.from('task_recurrence_rules').update({source_task_id:ins.data[0].id}).eq('id',ruleId).then(()=>0);if(selected.length&&ins.data?.length){let links=[];ins.data.forEach(t=>selected.forEach(user_id=>links.push({task_id:t.id,user_id})));if(links.length)await S.sb.from('task_assignees').insert(links).then(()=>0)}return ins.data||[]}
document.addEventListener('change',e=>{if(e.target&&['taskRepeatEnabled','taskRepeatType'].includes(e.target.id))syncTaskRecurrenceUi()},true);
setTimeout(ensureTaskRecurrenceUi,0);
/* Task recurrence v2 end */
'''

STYLE = r'''
/* Task recurrence v2 start */
.task-recurrence-box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#f8fafc;display:grid;gap:10px}.task-recurrence-head{display:flex;align-items:center;gap:8px;font-weight:800}.task-repeat-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.task-repeat-weekdays{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.task-repeat-weekdays label{display:inline-flex;align-items:center;gap:4px;border:1px solid #dbe4ef;border-radius:999px;background:#fff;padding:5px 8px;font-size:12px;font-weight:800}.task-repeat-existing-note{font-size:12px;color:#64748b}.task-repeat-badge{display:inline-flex;align-items:center;gap:3px;border:1px solid #dbe4ef;border-radius:999px;padding:2px 6px;font-size:11px;color:#2563eb;background:#eff6ff;font-weight:800}@media(max-width:720px){.task-repeat-options{grid-template-columns:1fr}}
/* Task recurrence v2 end */
'''

TASK_COLUMNS_NEW = "id,project_id,title,notes,status,priority,start_date,due_date,created_at,updated_at,deleted_at,assignee_id,completed_at,sort_order,is_favorite,recurrence_rule_id,recurrence_date"

s = RUNTIME.read_text(encoding='utf-8')
s = re.sub(r'/\* Task recurrence v1 start \*/[\s\S]*?/\* Task recurrence v1 end \*/\n?', '', s)
s = re.sub(r'/\* Task recurrence v2 start \*/[\s\S]*?/\* Task recurrence v2 end \*/\n?', '', s)
s = re.sub(r"const TASK_COLUMNS='[^']*';", f"const TASK_COLUMNS='{TASK_COLUMNS_NEW}';", s, count=1)
marker = 'async function saveTask(e)'
if marker not in s:
    raise SystemExit('saveTask marker not found')
s = s.replace(marker, RECURRENCE_JS + '\n' + marker, 1)
# Ensure openTask initializes recurrence UI.
s = s.replace("$('taskNotes').value=t?.notes||'';$('taskModal')?.showModal()", "$('taskNotes').value=t?.notes||'';setupTaskRecurrenceFields(t,id);$('taskModal')?.showModal()")
s = s.replace("$('taskNotes').value=t?.notes||'';setupTaskRecurrenceFields(t,id);setupTaskRecurrenceFields(t,id);$('taskModal')?.showModal()", "$('taskNotes').value=t?.notes||'';setupTaskRecurrenceFields(t,id);$('taskModal')?.showModal()")
# Replace saveTask with recurrence-aware implementation.
m = re.search(r"async function saveTask\(e\)\{[\s\S]*?\}\nasync function saveUser", s)
if not m:
    raise SystemExit('saveTask function not found')
new_save = """async function saveTask(e){e.preventDefault();let id=$('taskId').value||null,row={title:$('taskTitle').value.trim(),project_id:$('taskProject').value,status:$('taskStatus').value,priority:$('taskPriority').value,start_date:$('taskStart').value||null,due_date:$('taskDue').value||null,notes:$('taskNotes').value||null};if(!row.title)return alert('Введите название задачи');let selected=qa('#taskAssignee option').filter(o=>o.selected).map(o=>o.value);row.assignee_id=selected[0]||null;if(!id&&taskRecurrenceEnabled()){try{await createRecurringTasks(row,selected);$('taskModal').close();await load();return}catch(err){alert(err.message||String(err));return}}let r=id?await S.sb.from('tasks').update(row).eq('id',id).select().single():await S.sb.from('tasks').insert(row).select().single();if(r.error)throw Error(r.error.message);let taskId=r.data.id;await S.sb.from('task_assignees').delete().eq('task_id',taskId).then(()=>0);if(selected.length)await S.sb.from('task_assignees').insert(selected.map(user_id=>({task_id:taskId,user_id}))).then(()=>0);$('taskModal').close();await load()}
async function saveUser"""
s = s[:m.start()] + new_save + s[m.end():]
# Badge if templates use plain h4 title.
s = s.replace("<h4>${esc(t.title)}</h4>", "<h4>${esc(t.title)} ${t.recurrence_rule_id?'<span class=\"task-repeat-badge\" title=\"Повторяется\">↻</span>':''}</h4>")
RUNTIME.write_text(s, encoding='utf-8')

# Persist the block in index.html as well.
html = INDEX.read_text(encoding='utf-8')
if 'taskRepeatEnabled' not in html:
    html = html.replace("<label><span>Срок</span><input class='input' id='taskDue' type='date'></label><label class='full'><span>Описание</span>", "<label><span>Срок</span><input class='input' id='taskDue' type='date'></label>" + REC_BLOCK_HTML + "<label class='full'><span>Описание</span>")
html = re.sub(r"assets/app\.js\?v=[^'\"]+", 'assets/app.js?v=20260519-recurrence-modal-v2', html)
html = re.sub(r"assets/app\.css\?v=[^'\"]+", 'assets/app.css?v=20260519-recurrence-modal-v2', html)
INDEX.write_text(html, encoding='utf-8')

# Update loader runtime cache-busting.
if APP.exists():
    loader = APP.read_text(encoding='utf-8')
    loader = re.sub(r"assets/app-runtime\.js\?v=[^'\"]+", 'assets/app-runtime.js?v=20260519-recurrence-modal-v2', loader)
    APP.write_text(loader, encoding='utf-8')

c = CSS.read_text(encoding='utf-8') if CSS.exists() else ''
c = re.sub(r'/\* Task recurrence v1 start \*/[\s\S]*?/\* Task recurrence v1 end \*/\n?', '', c)
c = re.sub(r'/\* Task recurrence v2 start \*/[\s\S]*?/\* Task recurrence v2 end \*/\n?', '', c)
CSS.write_text(c.rstrip() + '\n' + STYLE, encoding='utf-8')

for p in [ROOT/'.github/scripts/fix_recurrence_modal.py', ROOT/'.github/workflows/fix-recurrence-modal.yml']:
    if p.exists():
        p.unlink()
