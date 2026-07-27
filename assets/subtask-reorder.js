(function(){
  'use strict';

  if(window.__SUBTASK_REORDER_V1__) return;
  window.__SUBTASK_REORDER_V1__ = true;

  var RANK_STEP = 1000;
  var MIN_RANK = -2147483000;
  var MAX_RANK = 2147483000;
  var activeDrag = null;
  var observer = null;
  var savingTasks = new Set();

  function directRows(list){
    return Array.from(list ? list.children : []).filter(function(node){
      return node.classList && node.classList.contains('wk-subrow');
    });
  }

  function rowId(row){
    return row && (row.dataset.subtaskId || row.querySelector('[data-id]')?.dataset.id || '');
  }

  function taskIdFor(row){
    var list = row && row.closest('.wk-sublist');
    if(list && list.dataset.taskId) return list.dataset.taskId;
    var id = rowId(row);
    var item = (window.taskSubtasksV1 || []).find(function(subtask){ return subtask.id === id; });
    return item ? item.task_id : '';
  }

  function sameOrder(a,b){
    return a.length === b.length && a.every(function(id,index){ return id === b[index]; });
  }

  function rankNumber(value){
    var number = Number(value);
    return Number.isInteger(number) ? number : null;
  }

  function snapshotRanks(ids){
    var result = Object.create(null);
    var items = window.taskSubtasksV1 || [];
    ids.forEach(function(id){
      var item = items.find(function(subtask){ return subtask.id === id; });
      result[id] = item ? rankNumber(item.sort_order) : null;
    });
    return result;
  }

  function rebalanceRanks(ids, previous){
    return ids.map(function(id,index){
      return { id: id, sort_order: (index + 1) * RANK_STEP };
    }).filter(function(change){ return previous[change.id] !== change.sort_order; });
  }

  function planRankUpdates(ids, movedId, previous){
    var index = ids.indexOf(movedId);
    if(index < 0) return [];

    var previousId = index > 0 ? ids[index - 1] : '';
    var nextId = index < ids.length - 1 ? ids[index + 1] : '';
    var previousRank = previousId ? rankNumber(previous[previousId]) : null;
    var nextRank = nextId ? rankNumber(previous[nextId]) : null;
    var candidate = null;

    if(!previousId && !nextId){
      candidate = RANK_STEP;
    }else if(!previousId && nextRank !== null){
      candidate = nextRank - RANK_STEP;
    }else if(!nextId && previousRank !== null){
      candidate = previousRank + RANK_STEP;
    }else if(previousRank !== null && nextRank !== null && nextRank - previousRank > 1){
      candidate = Math.floor((previousRank + nextRank) / 2);
    }

    var usedByAnother = ids.some(function(id){
      return id !== movedId && rankNumber(previous[id]) === candidate;
    });
    if(
      candidate === null ||
      candidate < MIN_RANK ||
      candidate > MAX_RANK ||
      usedByAnother ||
      previous[movedId] === candidate
    ){
      return rebalanceRanks(ids, previous);
    }
    return [{ id: movedId, sort_order: candidate }];
  }

  function applyRankUpdates(updates){
    var items = window.taskSubtasksV1 || [];
    updates.forEach(function(change){
      var item = items.find(function(subtask){ return subtask.id === change.id; });
      if(item) item.sort_order = change.sort_order;
    });
  }

  function restoreRanks(previous){
    var items = window.taskSubtasksV1 || [];
    Object.keys(previous).forEach(function(id){
      var item = items.find(function(subtask){ return subtask.id === id; });
      if(item && previous[id] !== null) item.sort_order = previous[id];
    });
  }

  async function writeRankUpdates(taskId, updates){
    var client = window.sb;
    if(!client || typeof client.rpc !== 'function') throw new Error('Нет подключения к базе данных');
    var result = await client.rpc('reorder_task_subtasks', {
      p_task_id: taskId,
      p_updates: updates
    });
    if(result && result.error) throw result.error;
    if(!result || !Array.isArray(result.data) || result.data.length !== updates.length){
      throw new Error('Порядок не сохранён: недостаточно прав или список подзадач изменился');
    }
  }

  function reorderList(list, ids){
    if(!list) return;
    var rows = directRows(list);
    var byId = new Map(rows.map(function(row){ return [rowId(row), row]; }));
    ids.forEach(function(id){
      var row = byId.get(id);
      if(row) list.appendChild(row);
    });
  }

  function matchingLists(taskId){
    return Array.from(document.querySelectorAll('.wk-sublist')).filter(function(list){
      return list.dataset.taskId === taskId;
    });
  }

  function syncCopies(taskId, ids){
    matchingLists(taskId).forEach(function(list){ reorderList(list, ids); });
  }

  function setTaskState(taskId, className, enabled){
    matchingLists(taskId).forEach(function(list){
      var block = list.closest('.wk-sub');
      if(block){
        block.classList.toggle(className, enabled);
        if(className === 'subtask-saving') block.setAttribute('aria-busy', enabled ? 'true' : 'false');
      }
    });
    refreshHandles();
  }

  function liveRegion(){
    var region = document.getElementById('subtaskReorderLive');
    if(region) return region;
    region = document.createElement('div');
    region.id = 'subtaskReorderLive';
    region.className = 'subtask-reorder-live';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
    return region;
  }

  function announce(message){
    var region = liveRegion();
    region.textContent = '';
    window.requestAnimationFrame(function(){ region.textContent = message; });
  }

  function refreshHandles(){
    document.querySelectorAll('.wk-sublist').forEach(function(list){
      var rows = directRows(list);
      var taskId = list.dataset.taskId || '';
      rows.forEach(function(row,index){
        var handle = row.querySelector('.wk-subdrag-handle');
        if(!handle) return;
        handle.disabled = rows.length < 2 || savingTasks.has(taskId);
        handle.setAttribute('aria-label', 'Изменить порядок подзадачи: позиция ' + (index + 1) + ' из ' + rows.length);
        handle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
        handle.setAttribute('draggable', 'false');
      });
    });
  }

  async function commitOrder(taskId, ids, originalIds, movedId, previous){
    if(!taskId || sameOrder(ids, originalIds)) return;
    var updates = planRankUpdates(ids, movedId, previous);
    if(!updates.length) return;

    savingTasks.add(taskId);
    applyRankUpdates(updates);
    syncCopies(taskId, ids);
    setTaskState(taskId, 'subtask-saving', true);
    announce('Подзадача перемещена на позицию ' + (ids.indexOf(movedId) + 1) + '. Сохраняю порядок.');

    try{
      await writeRankUpdates(taskId, updates);
      setTaskState(taskId, 'subtask-order-saved', true);
      announce('Новый порядок подзадач сохранён.');
      setTimeout(function(){ setTaskState(taskId, 'subtask-order-saved', false); }, 700);
    }catch(error){
      restoreRanks(previous);
      syncCopies(taskId, originalIds);
      announce('Не удалось сохранить порядок подзадач.');
      alert('Не удалось сохранить порядок подзадач: ' + (error.message || error));
      setTimeout(function(){ document.getElementById('refreshBtn')?.click(); }, 0);
    }finally{
      savingTasks.delete(taskId);
      setTaskState(taskId, 'subtask-saving', false);
    }
  }

  function startPointerDrag(event, handle){
    if(event.pointerType === 'mouse' && event.button !== 0) return;
    var row = handle.closest('.wk-subrow');
    var list = row && row.closest('.wk-sublist');
    if(!row || !list) return;
    var taskId = taskIdFor(row);
    var rows = directRows(list);
    if(rows.length < 2 || savingTasks.has(taskId)) return;

    event.preventDefault();
    event.stopPropagation();
    var ids = rows.map(rowId);
    activeDrag = {
      pointerId: event.pointerId,
      handle: handle,
      row: row,
      list: list,
      taskId: taskId,
      movedId: rowId(row),
      originalIds: ids,
      previous: snapshotRanks(ids)
    };
    row.classList.add('subtask-dragging');
    list.classList.add('subtask-reordering');
    document.body.classList.add('subtask-pointer-active');
    handle.setAttribute('aria-grabbed', 'true');
    try{ handle.setPointerCapture(event.pointerId); }catch(_error){}
  }

  function movePointerDrag(event){
    var drag = activeDrag;
    if(!drag || event.pointerId !== drag.pointerId) return;
    if(!drag.row.isConnected){ cancelPointerDrag(); return; }
    event.preventDefault();
    event.stopPropagation();

    var before = null;
    directRows(drag.list).filter(function(row){ return row !== drag.row; }).some(function(row){
      var rect = row.getBoundingClientRect();
      if(event.clientY < rect.top + rect.height / 2){ before = row; return true; }
      return false;
    });
    if(before) drag.list.insertBefore(drag.row, before);
    else drag.list.appendChild(drag.row);

    if(window.innerHeight && event.clientY < 72) window.scrollBy(0, -10);
    else if(window.innerHeight && event.clientY > window.innerHeight - 72) window.scrollBy(0, 10);
  }

  function cleanPointerDrag(){
    var drag = activeDrag;
    if(!drag) return null;
    drag.row.classList.remove('subtask-dragging');
    drag.list.classList.remove('subtask-reordering');
    document.body.classList.remove('subtask-pointer-active');
    drag.handle.setAttribute('aria-grabbed', 'false');
    try{ drag.handle.releasePointerCapture(drag.pointerId); }catch(_error){}
    activeDrag = null;
    return drag;
  }

  function notifyDragFinished(){
    document.dispatchEvent(new CustomEvent('subtask-reorder-finished'));
  }

  function finishPointerDrag(event){
    if(!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    var drag = cleanPointerDrag();
    if(!drag || !drag.list.isConnected){
      notifyDragFinished();
      return;
    }
    var ids = directRows(drag.list).map(rowId);
    notifyDragFinished();
    commitOrder(drag.taskId, ids, drag.originalIds, drag.movedId, drag.previous);
  }

  function cancelPointerDrag(){
    var drag = cleanPointerDrag();
    if(drag && drag.list.isConnected) reorderList(drag.list, drag.originalIds);
    if(drag) notifyDragFinished();
  }

  async function moveWithKeyboard(event, handle){
    if(event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    var row = handle.closest('.wk-subrow');
    var list = row && row.closest('.wk-sublist');
    if(!row || !list) return;
    var taskId = taskIdFor(row);
    if(savingTasks.has(taskId)) return;
    var rows = directRows(list);
    var index = rows.indexOf(row);
    var target = event.key === 'ArrowUp' ? index - 1 : index + 1;
    if(target < 0 || target >= rows.length) return;

    event.preventDefault();
    event.stopPropagation();
    var originalIds = rows.map(rowId);
    var previous = snapshotRanks(originalIds);
    if(event.key === 'ArrowUp') list.insertBefore(row, rows[target]);
    else list.insertBefore(row, rows[target].nextSibling);
    var ids = directRows(list).map(rowId);
    var movedId = rowId(row);
    await commitOrder(taskId, ids, originalIds, movedId, previous);
    window.requestAnimationFrame(function(){
      var current = matchingLists(taskId)
        .map(function(copy){ return directRows(copy).find(function(item){ return rowId(item) === movedId; }); })
        .filter(Boolean)[0];
      current?.querySelector('.wk-subdrag-handle')?.focus();
    });
  }

  document.addEventListener('pointerdown', function(event){
    var handle = event.target.closest('.wk-subdrag-handle');
    if(handle) startPointerDrag(event, handle);
  }, true);
  document.addEventListener('pointermove', movePointerDrag, { capture: true, passive: false });
  document.addEventListener('pointerup', finishPointerDrag, true);
  document.addEventListener('pointercancel', cancelPointerDrag, true);
  document.addEventListener('keydown', function(event){
    var handle = event.target.closest('.wk-subdrag-handle');
    if(handle) moveWithKeyboard(event, handle).catch(function(error){ console.warn('[subtask reorder]', error); });
  }, true);
  document.addEventListener('click', function(event){
    if(event.target.closest('.wk-subdrag-handle')){
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  document.addEventListener('dragstart', function(event){
    if(activeDrag || event.target.closest('.wk-subdrag-handle')){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('blur', cancelPointerDrag);

  function boot(){
    refreshHandles();
    var board = document.getElementById('kanban');
    if(!board){ setTimeout(boot, 100); return; }
    if(!observer){
      observer = new MutationObserver(refreshHandles);
      observer.observe(board, { childList: true, subtree: true });
    }
  }

  if(window.__PT_SUBTASK_REORDER_TEST__){
    window.__SUBTASK_REORDER_TEST_API__ = {
      planRankUpdates: planRankUpdates,
      applyRankUpdates: applyRankUpdates,
      writeRankUpdates: writeRankUpdates,
      sameOrder: sameOrder
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

