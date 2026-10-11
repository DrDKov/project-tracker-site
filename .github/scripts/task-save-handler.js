// Canonical handler injected by apply_recurrence_scope.py into app-runtime.js.
async function saveTask(e){
  e.preventDefault();ensureTaskCalendarUi();
  const drafts=window.ProjectTrackerDrafts,token=drafts?.token(),userId=S.user?.id;
  drafts?.capture();
  drafts?.beginAction();
  let id=$('taskId').value||null,row={title:$('taskTitle').value.trim(),project_id:$('taskProject').value,status:$('taskStatus').value,priority:$('taskPriority').value,start_date:$('taskStart').value||null,due_date:$('taskDue').value||null,notes:$('taskNotes').value||null};
  if(!row.title)return alert('Введите название задачи');
  Object.assign(row,readTaskCalendarFields());
  let selected=qa('#taskAssignee option').filter(o=>o.selected).map(o=>o.value);row.assignee_id=selected[0]||null;
  const finished=async()=>{
    if(S.user?.id!==userId)return;
    drafts?.saved(token);$('taskModal').close();await load();
  };
  if(!id&&typeof taskRecurrenceEnabled==='function'&&taskRecurrenceEnabled()){
    await createRecurringTasks(row,selected);await finished();return true;
  }
  if(id){
    let cur=byId(S.tasks,id),scope=cur&&cur.recurrence_rule_id?recurrenceUpdateScope():'one';
    if(cur&&cur.recurrence_rule_id&&scope!=='one'){
      let ids=recurrenceScopedTasks(cur,scope).map(x=>x.id).filter(Boolean);
      if(!ids.length)throw Error('Не найдены задачи серии');
      let r=await S.sb.from('tasks').update(rowForRecurrenceSeriesUpdate(row)).in('id',ids).select('id');
      if(r.error)throw r.error;
      for(let taskId of ids)await syncTaskAssignees(taskId,selected);
      await finished();return true;
    }
  }
  let r=id?await S.sb.from('tasks').update(row).eq('id',id).select().single():await S.sb.from('tasks').insert(row).select().single();
  if(r.error)throw r.error;
  let taskId=r.data.id;
  if(S.user?.id!==userId)return false;
  // Retrying assignment sync must update the created task, not insert a duplicate.
  $('taskId').value=taskId;rtUpsert('tasks',r.data);drafts?.persisted(token,taskId);
  await syncTaskAssignees(taskId,selected);
  await finished();return true;
}
