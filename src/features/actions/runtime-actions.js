import {
  saveProjectRecord,
  saveUserRecord,
  softDeleteRecord,
  upsertProjectMember
} from '../../services/workspace.service.js';
import {
  createSubtaskRecord,
  deleteSubtaskRecord,
  replaceTaskAssignees,
  saveTaskRecord,
  setTaskFavorite,
  updateSubtaskDone,
  updateTaskCompletion,
  updateTaskStatus,
  updateTaskTimelineDates
} from '../../services/tasks.service.js';

export function createRuntimeActions(deps) {
  const { S, $, qa, byId, subs, load, render, renderTasks, renderTimeline, renderAccess, ensureTaskCalendarUi, readTaskCalendarFields, taskRecurrenceEnabled, createRecurringTasks } = deps;
async function saveProject(e){e.preventDefault();let id=$('projectId').value||null,row={name:$('projectName').value.trim(),owner_id:$('projectOwner').value||null,status:$('projectStatus').value,priority:$('projectPriority').value,start_date:$('projectStart').value||null,deadline:$('projectDeadline').value||null,color:$('projectColor').value||'#111827',next_step:$('projectNext').value||null,description:$('projectDescription').value||null};if(!row.name)return alert('Введите название проекта');await saveProjectRecord(S.sb,id,row);$('projectModal').close();await load()}





async function saveTask(e){e.preventDefault();ensureTaskCalendarUi();let id=$('taskId').value||null,row={title:$('taskTitle').value.trim(),project_id:$('taskProject').value,status:$('taskStatus').value,priority:$('taskPriority').value,start_date:$('taskStart').value||null,due_date:$('taskDue').value||null,notes:$('taskNotes').value||null};if(!row.title)return alert('Введите название задачи');try{Object.assign(row,readTaskCalendarFields())}catch(err){alert(err.message||String(err));return}let selected=qa('#taskAssignee option').filter(o=>o.selected).map(o=>o.value);row.assignee_id=selected[0]||null;if(!id&&typeof taskRecurrenceEnabled==='function'&&taskRecurrenceEnabled()){try{await createRecurringTasks(row,selected);$('taskModal').close();await load();return}catch(err){alert(err.message||String(err));return}}let saved=await saveTaskRecord(S.sb,id,row);let taskId=saved.id;await replaceTaskAssignees(S.sb,taskId,selected);$('taskModal').close();await load()}
async function saveUser(e){e.preventDefault();let id=$('userId').value||null,row={display_name:$('userName').value.trim(),email:$('userEmail').value.trim()||null,role:$('userRole').value,position:$('userPosition').value||null,is_active:true};if(!row.display_name)return alert('Введите имя');await saveUserRecord(S.sb,id,row);$('userModal').close();await load()}
async function saveAccess(e){e.preventDefault();let row={project_id:$('accessProjectId').value,user_id:$('accessUser').value,access_role:$('accessRole').value};if(!row.project_id||!row.user_id)return;await upsertProjectMember(S.sb,row);await load();renderAccess()}
async function del(table,id){if(!confirm('Удалить?'))return;await softDeleteRecord(S.sb,table,id);await load()}
async function toggleTask(id,done){let t=byId(S.tasks,id),old=t?{...t}:null;if(t){t.status=done?'done':'in_progress';t.completed_at=done?new Date().toISOString():null;t.completed_by_id=done?S.profile?.id:null;renderTasks();if(S.view==='timeline')renderTimeline()}try{await updateTaskCompletion(S.sb,id,done,S.profile?.id)}catch(e){if(old&&t)Object.assign(t,old);renderTasks();throw e}}
async function moveTask(id,st){let t=byId(S.tasks,id),old=t?{...t}:null;if(t){t.status=st;if(st==='done'){t.completed_at=new Date().toISOString();t.completed_by_id=S.profile?.id}else{t.completed_at=null;t.completed_by_id=null}renderTasks();if(S.view==='timeline')renderTimeline()}try{await updateTaskStatus(S.sb,id,st,S.profile?.id)}catch(e){if(old&&t)Object.assign(t,old);renderTasks();throw e}}
async function updateTaskTimeline(id,start_date,due_date){let t=byId(S.tasks,id),old=t?{...t}:null;if(t){t.start_date=start_date;t.due_date=due_date;if(S.view==='timeline')renderTimeline()}try{await updateTaskTimelineDates(S.sb,id,start_date,due_date)}catch(e){if(old&&t)Object.assign(t,old);if(S.view==='timeline')renderTimeline();throw e}}
async function addSubtask(task_id,title){let row=await createSubtaskRecord(S.sb,{task_id,title,created_by:S.profile?.id,sort_order:subs(task_id).length});S.subtasks.push(row);render()}
async function toggleSubtask(id,done){let s=byId(S.subtasks,id);if(s){s.is_done=done;render()}await updateSubtaskDone(S.sb,id,done)}
async function deleteSubtask(id){await deleteSubtaskRecord(S.sb,id);S.subtasks=S.subtasks.filter(x=>x.id!==id);render()}

  async function toggleTaskFavorite(id){let t=byId(S.tasks,id),old=t?!!t.is_favorite:false;if(!t)return;t.is_favorite=!old;renderTasks();if(S.view==='timeline')renderTimeline();try{await setTaskFavorite(S.sb,id,!old)}catch(e){t.is_favorite=old;renderTasks();if(S.view==='timeline')renderTimeline();throw e}}
  return { saveProject, saveTask, saveUser, saveAccess, del, toggleTask, moveTask, updateTaskTimeline, toggleTaskFavorite, addSubtask, toggleSubtask, deleteSubtask };
}
