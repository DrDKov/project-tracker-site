from pathlib import Path
import re
root=Path('.')
r=root/'assets/app-runtime.js'; c=root/'assets/app.css'; i=root/'index.html'; l=root/'assets/app.js'
ver='20260520-no-task-links-rollback-v1'
scope_js="""
/* Recurrence scope editing v3 start */
function ensureTaskRecurrenceScopeUi(){if($('taskRecurrenceScopeBox'))return;let a=$('taskRepeatExistingNote')||$('taskRepeatEnabled')?.closest('.task-recurrence-box')||$('taskDue')?.closest('label');if(!a)return;let b=document.createElement('div');b.id='taskRecurrenceScopeBox';b.className='full task-recurrence-scope hidden';b.innerHTML='<b>Применить изменения</b><label><input type="radio" name="taskRecurrenceScope" value="one" checked> Только эту задачу</label><label><input type="radio" name="taskRecurrenceScope" value="all"> Все задачи этой серии</label><label><input type="radio" name="taskRecurrenceScope" value="future"> Эту и будущие задачи серии</label><small id="taskRecurrenceScopeHint">Даты экземпляров серии не переносятся; меняются общие поля и время.</small>';a.parentNode.insertBefore(b,a.nextSibling)}
function recurrenceUpdateScope(){ensureTaskRecurrenceScopeUi();return qa('input[name="taskRecurrenceScope"]').find(x=>x.checked)?.value||'one'}
function setupTaskRecurrenceScope(t,id){ensureTaskRecurrenceScopeUi();let b=$('taskRecurrenceScopeBox');if(!b)return;let key=id||'';let is=!!(id&&t&&t.recurrence_rule_id);b.classList.toggle('hidden',!is);if(b.dataset.taskId!==key){b.dataset.taskId=key;qa('input[name="taskRecurrenceScope"]').forEach(x=>x.checked=x.value==='one')}let h=$('taskRecurrenceScopeHint');if(h&&is){let all=S.tasks.filter(x=>!x.deleted_at&&x.recurrence_rule_id===t.recurrence_rule_id),a=t.recurrence_date||t.start_date||t.due_date||today(),f=all.filter(x=>String(x.recurrence_date||x.start_date||x.due_date||'')>=a);h.textContent='Серия: '+all.length+' задач. Эта и будущие: '+f.length+'. Даты экземпляров не переносятся.'}}
function refreshTaskRecurrenceScope(){let id=$('taskId')?.value||null;let t=id?byId(S.tasks,id):null;setupTaskRecurrenceScope(t,id)}
function installTaskRecurrenceScopeObserver(){let m=$('taskModal');if(!m||m.__recurrenceScopeObserver)return;if(m.open)setTimeout(refreshTaskRecurrenceScope,0);let obs=new MutationObserver(()=>{if(m.open)setTimeout(refreshTaskRecurrenceScope,0)});obs.observe(m,{attributes:true,attributeFilter:['open']});m.__recurrenceScopeObserver=obs;document.addEventListener('change',e=>{if(e.target&&e.target.name==='taskRecurrenceScope')return;if(m.open)setTimeout(refreshTaskRecurrenceScope,80)},true)}
function recurrenceScopedTasks(t,scope){if(!t||!t.recurrence_rule_id||scope==='one')return t?[t]:[];let rows=S.tasks.filter(x=>!x.deleted_at&&x.recurrence_rule_id===t.recurrence_rule_id);if(scope==='future'){let a=String(t.recurrence_date||t.start_date||t.due_date||today());rows=rows.filter(x=>String(x.recurrence_date||x.start_date||x.due_date||'')>=a)}return rows}
function rowForRecurrenceSeriesUpdate(row){return{title:row.title,project_id:row.project_id,notes:row.notes||null,status:row.status,priority:row.priority,assignee_id:row.assignee_id||null,start_time:row.start_time||null,end_time:row.end_time||null,duration_minutes:row.duration_minutes||null,is_all_day:!!row.is_all_day}}
setTimeout(installTaskRecurrenceScopeObserver,0);
/* Recurrence scope editing v3 end */
"""
css="""
/* Recurrence scope editing v3 start */
.task-recurrence-scope{border:1px solid #dbe4ef;border-radius:14px;background:#fff;padding:12px;display:grid;gap:8px}.task-recurrence-scope.hidden{display:none!important}.task-recurrence-scope label{display:flex;align-items:center;gap:8px;font-size:13px}.task-recurrence-scope small{color:#64748b;line-height:1.35}
/* Recurrence scope editing v3 end */
"""
calendar_handler="""
/* Calendar timeline handlers v3 start */
document.addEventListener('change',e=>{if(e.target&&e.target.id==='taskAllDay')syncTaskCalendarUi();if(e.target&&['tlP','tlU','tlS','tlR','tlDone'].includes(e.target.id)&&S.view==='timeline')renderTimeline()},true);
document.addEventListener('input',e=>{if(e.target&&e.target.id==='tlQ'&&S.view==='timeline')renderTimeline()},true);
document.addEventListener('click',e=>{let b=e.target.closest?.('[data-action]');if(!b)return;let a=b.dataset.action;if(!String(a).startsWith('tl-'))return;e.preventDefault();e.stopPropagation();if(a==='tl-prev'){S.timelineDate=add(S.timelineDate||today(),-7);renderTimeline();return}if(a==='tl-next'){S.timelineDate=add(S.timelineDate||today(),7);renderTimeline();return}if(a==='tl-today'){S.timelineDate=today();renderTimeline();return}if(a==='tl-open'){openTask(b.dataset.id);return}if(a==='tl-add-day'){openTask(null);let d=b.dataset.date;if($('taskStart'))$('taskStart').value=d;if($('taskDue'))$('taskDue').value=d;fillTaskCalendarFields({});return}if(a==='tl-empty'){if(e.target.closest('.timeline-event'))return;let c=e.target.closest('.timeline-time-grid');if(!c)return;let r=c.getBoundingClientRect(),y=e.clientY-r.top,m=TL0*60+Math.round((y/TLP)/TLS)*TLS,tm=mt(m),en=mt(m+TLD),d=c.dataset.date;openTask(null);if($('taskStart'))$('taskStart').value=d;if($('taskDue'))$('taskDue').value=d;fillTaskCalendarFields({start_time:tm,end_time:en,duration_minutes:TLD,is_all_day:false});return}},true);
/* Calendar timeline handlers v3 end */
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
s=re.sub(r'/\* Recurrence scope editing v[123] start \*/[\s\S]*?/\* Recurrence scope editing v[123] end \*/\n?','',s)
s=s.replace('async function saveTask',scope_js+'\nasync function saveTask',1)
if 'setupTaskRecurrenceScope(t,id)' not in s:
    s=s.replace('fillTaskCalendarFields(t);','fillTaskCalendarFields(t);setupTaskRecurrenceScope(t,id);',1)
sv="async function saveTask(e){e.preventDefault();ensureTaskCalendarUi();let id=$('taskId').value||null,row={title:$('taskTitle').value.trim(),project_id:$('taskProject').value,status:$('taskStatus').value,priority:$('taskPriority').value,start_date:$('taskStart').value||null,due_date:$('taskDue').value||null,notes:$('taskNotes').value||null};if(!row.title)return alert('Введите название задачи');try{Object.assign(row,readTaskCalendarFields())}catch(err){alert(err.message||String(err));return}let selected=qa('#taskAssignee option').filter(o=>o.selected).map(o=>o.value);row.assignee_id=selected[0]||null;if(!id&&typeof taskRecurrenceEnabled==='function'&&taskRecurrenceEnabled()){try{await createRecurringTasks(row,selected);$('taskModal').close();await load();return}catch(err){alert(err.message||String(err));return}}if(id){let cur=byId(S.tasks,id),scope=cur&&cur.recurrence_rule_id?recurrenceUpdateScope():'one';if(cur&&cur.recurrence_rule_id&&scope!=='one'){let ids=recurrenceScopedTasks(cur,scope).map(x=>x.id).filter(Boolean);if(!ids.length){alert('Не найдены задачи серии');return}let r=await S.sb.from('tasks').update(rowForRecurrenceSeriesUpdate(row)).in('id',ids).select('id');if(r.error)throw Error(r.error.message);$('taskModal').close();await load();return}}let r=id?await S.sb.from('tasks').update(row).eq('id',id).select().single():await S.sb.from('tasks').insert(row).select().single();if(r.error)throw Error(r.error.message);let taskId=r.data.id;let old=await S.sb.from('task_assignees').delete().eq('task_id',taskId);if(old.error)console.warn(old.error);if(selected.length)await S.sb.from('task_assignees').insert(selected.map(user_id=>({task_id:taskId,user_id}))).then(()=>0);$('taskModal').close();await load()}"
s=rep_func(s,'saveTask',sv)
s=s.replace('data-action="tl-prev">← Неделя</button><button class="btn sm secondary" data-action="tl-next">Неделя →</button>','data-action="tl-prev" title="Предыдущая неделя">←</button><button class="btn sm secondary" data-action="tl-next" title="Следующая неделя">→</button>')
s=s.replace('data-action="tl-prev">←</button><button class="btn sm secondary" data-action="tl-next">→</button>','data-action="tl-prev" title="Предыдущая неделя">←</button><button class="btn sm secondary" data-action="tl-next" title="Следующая неделя">→</button>')
s=s.replace("((h-TL0)*60*TLP)+'px\">'+pad(h)+':00", "((h-TL0)*60*TLP+58)+'px\">'+pad(h)+':00")
s=re.sub(r'/\* Timeline week arrows v1 start \*/[\s\S]*?/\* Timeline week arrows v1 end \*/\n?','',s)
s=re.sub(r'/\* Calendar timeline handlers v[123] start \*/[\s\S]*?/\* Calendar timeline handlers v[123] end \*/\n?','',s)
marker='\n})();\n\n/* Timeline dynamic lane heights v104 start */'
pos=s.find(marker)
if pos<0:
    raise SystemExit('main runtime closure marker not found')
s=s[:pos]+calendar_handler+s[pos:]
r.write_text(s,encoding='utf-8')
cs=c.read_text(encoding='utf-8') if c.exists() else ''
cs=re.sub(r'/\* Recurrence scope editing v[123] start \*/[\s\S]*?/\* Recurrence scope editing v[123] end \*/\n?','',cs)
c.write_text(cs.rstrip()+'\n'+css,encoding='utf-8')
html=i.read_text(encoding='utf-8')
html=re.sub(r"assets/app\.js\?v=[^'\"]+",'assets/app.js?v='+ver,html)
html=re.sub(r"assets/app\.css\?v=[^'\"]+",'assets/app.css?v='+ver,html)
i.write_text(html,encoding='utf-8')
if l.exists():
    txt=l.read_text(encoding='utf-8')
    txt=re.sub(r"assets/app-runtime\.js\?v=[^'\"]+",'assets/app-runtime.js?v='+ver,txt)
    l.write_text(txt,encoding='utf-8')
