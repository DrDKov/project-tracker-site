(function(){
  'use strict';
  if(window.__PT_TASK_INSPECTOR_V1__) return;
  window.__PT_TASK_INSPECTOR_V1__ = true;
  const $ = id => document.getElementById(id);
  const mq = window.matchMedia('(min-width:981px)');
  const fieldIds = ['taskTitle','taskProject','taskAssignee','taskStatus','taskPriority','taskStart','taskDue','taskNotes','taskAllDay','taskStartTime','taskEndTime','taskDurationMinutes','taskRepeatEnabled','taskRepeatType','taskRepeatUntil'];
  let dialog, form, baseline = '', opener = null, pendingAction = null, allowNextOpen = false;
  let tab = 'details', expanded = false;

  function snapshot(){
    return JSON.stringify(fieldIds.map(id => {
      const field = $(id);
      if(!field) return [id,null];
      return [id,field.multiple ? Array.from(field.selectedOptions,option => option.value) : field.type === 'checkbox' ? field.checked : field.value];
    }).concat([
      ['weekdays',Array.from(form.querySelectorAll('.task-repeat-weekday:checked'),field => field.value)],
      ['scope',form.querySelector('[name="taskRecurrenceScope"]:checked')?.value || 'one']
    ]));
  }
  function dirty(){
    return dialog.open && (snapshot() !== baseline || Boolean($('taskCommentText')?.value.trim()) || Boolean(form.querySelector('.task-comment-edit-text')));
  }
  function saving(){
    return $('taskSaveBtn')?.disabled || $('taskSaveBtn')?.getAttribute('aria-busy') === 'true' ||
      (Boolean($('taskId').value) && Boolean(form.querySelector('[data-action="add-task-comment"]:disabled'))) ||
      Boolean(form.querySelector('[data-action="save-task-comment-edit"]:disabled'));
  }
  function highlightTask(scroll = false){
    const id = dialog.open ? $('taskId').value : '';
    document.querySelectorAll('.task-card[data-task-id]').forEach(card => {
      const selected = Boolean(id && card.dataset.taskId === id);
      card.classList.toggle('task-inspector-selected',selected);
      if(!selected || !scroll || !mq.matches || expanded) return;
      const board = card.closest('.kanban');
      if(!board) return;
      const bounds = board.getBoundingClientRect(), rect = card.getBoundingClientRect();
      if(rect.right > bounds.right) board.scrollLeft += rect.right - bounds.right + 12;
      else if(rect.left < bounds.left) board.scrollLeft += rect.left - bounds.left - 12;
    });
  }
  function protectCommentDraft(event){
    const draft = $('taskCommentText')?.value.trim();
    const editing = form.querySelector('.task-comment-edit-text');
    if(!draft && !editing) return false;
    event.preventDefault(); event.stopImmediatePropagation();
    chooseTab('comments');
    $('taskInspectorSaveHint').textContent = editing ? 'Сохраните или отмените правку комментария' : 'Отправьте комментарий или очистите поле';
    (editing || $('taskCommentText')).focus({preventScroll:true});
    return true;
  }
  function updateStatus(){
    if(!dialog.open) return;
    const changed = dirty();
    dialog.classList.toggle('has-unsaved-changes',changed);
    $('taskInspectorSaveHint').textContent = changed ? 'Есть несохранённые изменения' : 'Сохранение по кнопке';
  }
  function chooseTab(value, focus = false){
    tab = value === 'comments' ? 'comments' : 'details';
    dialog.dataset.inspectorTab = tab;
    form.querySelector('.form-grid').hidden = tab !== 'details';
    $('taskCommentsBlock').hidden = tab !== 'comments';
    form.querySelectorAll('[data-inspector-tab]').forEach(button => {
      const selected = button.dataset.inspectorTab === tab;
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex = selected ? 0 : -1;
      if(focus && selected) button.focus();
    });
  }
  function syncPresentation(){
    if(!dialog.open) return;
    const active = document.activeElement;
    const desktop = mq.matches;
    const modal = dialog.matches(':modal');
    if(desktop === modal){
      dialog.close();
      desktop ? dialog.show() : dialog.showModal();
      if(active && dialog.contains(active)) active.focus({preventScroll:true});
    }
    dialog.setAttribute('aria-modal',String(!desktop));
    document.body.classList.toggle('task-inspector-open',desktop);
    document.body.classList.toggle('task-inspector-expanded',desktop && expanded);
    document.body.classList.toggle('task-inspector-mobile-open',!desktop);
    $('taskInspectorExpand').hidden = !desktop;
    $('taskInspectorExpand').setAttribute('aria-pressed',String(expanded));
    $('taskInspectorExpand').setAttribute('aria-label',expanded ? 'Свернуть редактор' : 'Развернуть редактор');
    $('taskInspectorExpand').title = expanded ? 'Свернуть редактор' : 'Развернуть редактор';
    $('taskInspectorExpand').innerHTML = expanded ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3m18 0h-5V3M3 16h5v5m8 0v-5h5"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
  }
  function hideWarning(){
    $('taskInspectorDiscard').hidden = true;
    pendingAction = null;
  }
  function guard(action){
    if(saving()) return false;
    if(!dirty()){ action(); return true; }
    pendingAction = action;
    $('taskInspectorDiscard').hidden = false;
    $('taskInspectorKeep').focus({preventScroll:true});
    return false;
  }
  function close(){
    hideWarning();
    dialog.close();
  }
  function cleanup(){
    // A responsive change may close and immediately reopen the same dialog.
    if(dialog.open) return;
    document.body.classList.remove('task-inspector-open','task-inspector-expanded','task-inspector-mobile-open');
    highlightTask();
    expanded = false;
    hideWarning();
    if(opener?.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement))) opener.focus({preventScroll:true});
    opener = null;
  }
  function prepareOpen(id,pid,preset,resume){
    if(allowNextOpen){ allowNextOpen = false; return true; }
    if(dialog.open && id && $('taskId').value === id) return 'reuse';
    if(!dialog.open) return true;
    if(saving()) return false;
    if(!dirty()) return true;
    guard(() => { allowNextOpen = true; resume(); });
    return false;
  }
  function open(preset = {}){
    if(!dialog.open){
      opener = document.activeElement;
      mq.matches ? dialog.show() : dialog.showModal();
    }
    hideWarning();
    baseline = snapshot();
    const isNew = !$('taskId').value;
    form.querySelector('.modal-head h3').textContent = isNew ? 'Новая задача' : $('taskTitle').value || 'Задача';
    $('taskInspectorSubtitle').textContent = isNew ? 'Создание задачи' : 'Детали и обсуждение';
    form.querySelector('.modal-actions [data-close="taskModal"]').textContent = isNew ? 'Отмена' : 'Закрыть';
    chooseTab(preset.tab);
    syncPresentation();
    form.querySelector('.form-grid').scrollTop = 0;
    updateStatus();
    requestAnimationFrame(() => {
      highlightTask(true);
      if(tab === 'comments') $('taskCommentText')?.focus({preventScroll:true});
      else if(isNew) $('taskTitle')?.focus({preventScroll:true});
      else form.querySelector('.modal-head h3').focus({preventScroll:true});
    });
  }
  function reveal(preset = {}){
    if(preset.tab) chooseTab(preset.tab);
    if(preset.tab === 'comments') requestAnimationFrame(() => $('taskCommentText')?.focus({preventScroll:true}));
  }
  function boot(){
    dialog = $('taskModal'); form = $('taskForm');
    if(!dialog || !form) return;
    dialog.classList.add('task-inspector');
    dialog.setAttribute('aria-labelledby','taskInspectorTitle');
    const heading = form.querySelector('.modal-head h3');
    heading.id = 'taskInspectorTitle'; heading.tabIndex = -1;
    const titleGroup = document.createElement('div'); titleGroup.className = 'task-inspector-heading';
    heading.before(titleGroup); titleGroup.append(heading);
    const subtitle = document.createElement('span'); subtitle.id = 'taskInspectorSubtitle'; titleGroup.append(subtitle);
    const actions = document.createElement('div'); actions.className = 'task-inspector-head-actions';
    actions.innerHTML = '<button class="x" type="button" id="taskInspectorExpand" aria-label="Развернуть редактор" aria-pressed="false"></button>';
    const closeButton = form.querySelector('.modal-head [data-close="taskModal"]');
    closeButton.setAttribute('aria-label','Закрыть задачу'); closeButton.title = 'Закрыть задачу';
    form.querySelector('.modal-head').append(actions); actions.append(closeButton);
    const tabs = document.createElement('div'); tabs.className = 'task-inspector-tabs'; tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Содержимое задачи');
    tabs.innerHTML = '<button id="taskInspectorDetailsTab" type="button" role="tab" data-inspector-tab="details" aria-controls="taskDetailsPanel" aria-selected="true">Детали</button><button id="taskInspectorCommentsTab" type="button" role="tab" data-inspector-tab="comments" aria-controls="taskCommentsBlock" aria-selected="false" tabindex="-1">Комментарии <span id="taskInspectorCommentCount">0</span></button>';
    form.querySelector('.modal-head').after(tabs);
    const details = form.querySelector('.form-grid'); details.id = 'taskDetailsPanel'; details.setAttribute('role','tabpanel'); details.setAttribute('aria-labelledby','taskInspectorDetailsTab');
    $('taskCommentsBlock').setAttribute('role','tabpanel'); $('taskCommentsBlock').setAttribute('aria-labelledby','taskInspectorCommentsTab');
    const warning = document.createElement('div'); warning.id = 'taskInspectorDiscard'; warning.hidden = true; warning.setAttribute('role','alert');
    warning.innerHTML = '<div><b>Есть несохранённые изменения</b><span>Продолжить без их сохранения?</span></div><div class="task-inspector-discard-actions"><button type="button" class="btn secondary" id="taskInspectorKeep">Остаться</button><button type="button" class="btn danger" id="taskInspectorDiscardConfirm">Не сохранять</button></div>';
    tabs.after(warning);
    const hint = document.createElement('span'); hint.id = 'taskInspectorSaveHint'; hint.className = 'muted'; hint.setAttribute('role','status');
    form.querySelector('.modal-actions').prepend(hint);
    dialog.addEventListener('click',event => {
      const closeButton = event.target.closest('[data-close="taskModal"]');
      if(closeButton){ event.preventDefault(); event.stopImmediatePropagation(); guard(close); return; }
      if(event.target.closest('#taskSaveBtn') && protectCommentDraft(event)) return;
      const button = event.target.closest('.task-inspector-tabs > [data-inspector-tab]');
      if(button){ chooseTab(button.dataset.inspectorTab); return; }
      if(event.target.closest('#taskInspectorExpand')){ expanded = !expanded; syncPresentation(); return; }
      if(event.target.closest('#taskInspectorKeep')){ hideWarning(); form.querySelector('[data-inspector-tab][aria-selected="true"]').focus({preventScroll:true}); return; }
      if(event.target.closest('#taskInspectorDiscardConfirm')){ const action = pendingAction; hideWarning(); action?.(); }
    },true);
    tabs.addEventListener('keydown',event => {
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        event.preventDefault(); chooseTab(event.key === 'Home' ? 'details' : event.key === 'End' ? 'comments' : tab === 'details' ? 'comments' : 'details',true);
      }
    });
    dialog.addEventListener('cancel',event => { event.preventDefault(); guard(close); });
    dialog.addEventListener('close',cleanup);
    form.addEventListener('input',updateStatus); form.addEventListener('change',updateStatus);
    form.addEventListener('submit',protectCommentDraft,true);
    // Invalid controls may live on the inactive Details tab.
    form.addEventListener('invalid',() => chooseTab('details'),true);
    document.addEventListener('keydown',event => {
      if(event.key !== 'Escape' || !dialog.open || !mq.matches || document.querySelector('dialog:modal')) return;
      if(!$('taskInspectorDiscard').hidden){ hideWarning(); return; }
      event.preventDefault(); guard(close);
    });
    window.addEventListener('beforeunload',event => { if(dirty()){ event.preventDefault(); event.returnValue = ''; } });
    new MutationObserver(() => { $('taskInspectorCommentCount').textContent = $('taskCommentsCount').textContent; }).observe($('taskCommentsCount'),{childList:true,characterData:true,subtree:true});
    new MutationObserver(updateStatus).observe($('taskCommentsList'),{childList:true,subtree:true});
    if($('kanban')) new MutationObserver(() => highlightTask()).observe($('kanban'),{childList:true});
    mq.addEventListener('change',syncPresentation);
    chooseTab('details');
    window.ProjectTrackerTaskInspector = {prepareOpen,open,reveal};
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
