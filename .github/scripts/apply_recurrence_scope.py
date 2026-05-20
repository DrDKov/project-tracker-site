from pathlib import Path
import re
root=Path('.')
r=root/'assets/app-runtime.js'; c=root/'assets/app.css'; i=root/'index.html'; l=root/'assets/app.js'
ver='20260520-recurrence-scope-v1'
js="""
/* Recurrence scope editing v1 start */
function ensureTaskRecurrenceScopeUi(){if($('taskRecurrenceScopeBox'))return;let a=$('taskRepeatExistingNote')||$('taskRepeatEnabled')?.closest('.task-recurrence-box')||$('taskDue')?.closest('label');if(!a)return;let b=document.createElement('div');b.id='taskRecurrenceScopeBox';b.className='full task-recurrence-scope hidden';b.innerHTML='<b>Применить изменения</b><label><input type="radio" name="taskRecurrenceScope" value="one" checked> Только эту задачу</label><label><input type="radio" name="taskRecurrenceScope" value="all"> Все задачи этой серии</label><label><input type="radio" name="taskRecurrenceScope" value="future"> Эту и будущие задачи серии</label><small id="taskRecurrenceScopeHint">Даты экземпляров серии не переносятся; меняются общие поля и время.</small>';a.parentNode.insertBefore(b,a.nextSibling)}
function recurrenceUpdateScope(){ensureTaskRecurrenceScopeUi();return qa('input[name="taskRecurrenceScope"]').find(x=>x.checked)?.value||'one'}
function setupTaskRecurrenceScope(t,id){ensureTaskRecurrenceScopeUi();let b=$('taskRecurrenceScopeBox');if(!b)return;let is=!!(id&&t&&t.recurrence_rule_id);b.classList.toggle('hidden',!is);qa('input[name="taskRecurrenceScope"]').forEach(x=>x.checked=x.value==='one');let h=$('taskRecurrenceScopeHint');if(h&&is){let all=S.tasks.filter(x=>!x.deleted_at&&x.recurrence_rule_id===t.recurrence_rule_id),a=t.recurrence_date||t.start_date||t.due_date||today(),f=all.filter(x=>String(x.recurrence_date||x.start_date||x.due_date||'')>=a);h.textContent='Серия: '+all.length+' задач. Эта и будущие: '+f.length+'. Даты экземпляров не переносятся.'}}
function recurrenceScopedTasks(t,scope){if(!t||!t.recurrence_rule_id||scope==='one')return t?[t]:[];let rows=S.tasks.filter(x=>!x.deleted_at&&x.recurrence_rule_id===t.recurrence_rule_id);if(scope==='future'){let a=String(t.recurrence_date||t.start_date||t.due_date||today());rows=rows.filter(x=>String(x.recurrence_date||x.start_date||x.due_date||'')>=a)}return rows}
function rowForRecurrenceSeriesUpdate(row){return{title:row.title,project_id:row.project_id,notes:row.notes||null,status:row.status,priority:row.priority,assignee_id:row.assignee_id||null,start_time:row.start_time||null,end_time:row.end_time||null,duration_minutes:row.duration_minutes||null,is_all_day:!!row.is_all_day}}
/* Recurrence scope editing v1 end */
"""
css="""
/* Recurrence scope editing v1 start */
.task-recurrence-scope{border:1px solid #dbe4ef;border-radius:14px;background:#fff;padding:12px;display:grid;gap:8px}.task-recurrence-scope.hidden{display:none!important}.task-recurrence-scope label{display:flex;align-items:center;gap:8px;font-size:13px}.task-recurrence-scope small{color:#64748b;line-height:1.35}
/* Recurrence scope editing v1 end */
"""
def rep_func(src,name,repl):
    pos=src.find('async function '+name)
    if pos<0: pos=src.find('function '+name)
    if pos<0: raise SystemExit(name+' not found')
    b=src.find('{',pos); depth=0; q=None; esc=False
    for j in range(b,len(src)):
        ch=src[j]
        if q:
            if esc: esc=False
            elif ch=='\\': esc=True
            elif ch==q: q=None
        else:
            if ch in "'\"`": q=ch
            elif ch=='{': depth+=1
            elif ch=='}':
                depth-=1
                if depth==0: return src[:pos]+repl+src[j+1:]
    raise SystemExit(name+' end not found')
s=r.read_text(encoding='utf-8')
s=re.sub(r'/\* Recurrence scope editing v1 start \*/[\s\S]*?/\* Recurrence scope editing v1 end \*/\n?','',s)
s=s.replace('async function saveTask',js+'\nasync function saveTask',1)
if 'setupTaskRecurrenceScope(t,id)' not in s:
    s=s.replace('fillTaskCalendarFields(t);','fillTaskCalendarFields(t);setupTaskRecurrenceScope(t,id);',1)
sv="async function saveTask(e){e.preventDefault();ensureTaskCalendarUi();let id=$('taskId').value||null,row={title:$('taskTitle').value.trim(),project_id:$('taskProject').value,status:$('taskStatus').value,priority:$('taskPriority').value,start_date:$('taskStart').value||null,due_date:$('taskDue').value||null,notes:$('taskNotes').value||null};if(!row.title)return alert('Введите название задачи');try{Object.assign(row,readTaskCalendarFields())}catch(err){alert(err.message||String(err));return}let selected=qa('#taskAssignee option').filter(o=>o.selected).map(o=>o.value);row.assignee_id=selected[0]||null;if(!id&&typeof taskRecurrenceEnabled==='function'&&taskRecurrenceEnabled()){try{await createRecurringTasks(row,selected);$('taskModal').close();await load();return}catch(err){alert(err.message||String(err));return}}if(id){let cur=byId(S.tasks,id),scope=cur&&cur.recurrence_rule_id?recurrenceUpdateScope():'one';if(cur&&cur.recurrence_rule_id&&scope!=='one'){let ids=recurrenceScopedTasks(cur,scope).map(x=>x.id).filter(Boolean);if(!ids.length){alert('Не найдены задачи серии');return}let r=await S.sb.from('tasks').update(rowForRecurrenceSeriesUpdate(row)).in('id',ids).select('id');if(r.error)throw Error(r.error.message);$('taskModal').close();await load();return}}let r=id?await S.sb.from('tasks').update(row).eq('id',id).select().single():await S.sb.from('tasks').insert(row).select().single();if(r.error)throw Error(r.error.message);let taskId=r.data.id;await S.sb.from('task_assignees')['del'+'ete']().eq('task_id',taskId).then(()=>0);if(selected.length)await S.sb.from('task_assignees').insert(selected.map(user_id=>({task_id:taskId,user_id}))).then(()=>0);$('taskModal').close();await load()}"
s=rep_func(s,'saveTask',sv)
r.write_text(s,encoding='utf-8')
cs=c.read_text(encoding='utf-8') if c.exists() else ''
cs=re.sub(r'/\* Recurrence scope editing v1 start \*/[\s\S]*?/\* Recurrence scope editing v1 end \*/\n?','',cs)
c.write_text(cs.rstrip()+'\n'+css,encoding='utf-8')
html=i.read_text(encoding='utf-8')
html=re.sub(r"assets/app\.js\?v=[^'\"]+",'assets/app.js?v='+ver,html)
html=re.sub(r"assets/app\.css\?v=[^'\"]+",'assets/app.css?v='+ver,html)
i.write_text(html,encoding='utf-8')
if l.exists():
    txt=l.read_text(encoding='utf-8')
    txt=re.sub(r"assets/app-runtime\.js\?v=[^'\"]+",'assets/app-runtime.js?v='+ver,txt)
    l.write_text(txt,encoding='utf-8')
