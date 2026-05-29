import { createWorkspaceRealtimeChannel, removeRealtimeChannel } from '../services/realtime.service.js';
import { fetchRealtimeSnapshot } from '../services/workspace.service.js';

export function createRealtimeBridge(deps) {
  const { S, $, dedupeTaskAssignees, loadTasksSafe, scheduleRender, renderTaskCommentsModal } = deps;

  function rtId(row) {
    return row?.id || null;
  }

  function rtKey(row) {
    return row?.task_id && row?.user_id ? `${row.task_id}::${row.user_id}` : (row?.id || '');
  }

  function rtArray(table) {
    if (table === 'tasks') return S.tasks;
    if (table === 'projects') return S.projects;
    if (table === 'app_users') return S.users;
    if (table === 'task_assignees') return S.assignees;
    if (table === 'task_subtasks') return S.subtasks;
    if (table === 'task_comments') return S.taskComments;
    return null;
  }

  function rtNewer(local, row) {
    if (!local || !row) return true;
    const localTime = local.updated_at || local.created_at;
    const rowTime = row.updated_at || row.created_at;
    if (!localTime || !rowTime) return true;
    return new Date(rowTime) >= new Date(localTime);
  }

  function rtUpsert(table, row) {
    const arr = rtArray(table);
    if (!arr || !row) return false;
    if ((table === 'tasks' || table === 'projects' || table === 'task_subtasks' || table === 'task_comments') && row.deleted_at) return rtRemove(table, row);
    if (table === 'app_users' && row.is_active === false) return rtRemove(table, row);

    const key = table === 'task_assignees' ? rtKey(row) : rtId(row);
    if (!key) return false;

    const index = arr.findIndex((item) => (table === 'task_assignees' ? rtKey(item) : rtId(item)) === key);
    if (index >= 0) {
      if (!rtNewer(arr[index], row)) return false;
      arr[index] = { ...arr[index], ...row };
    } else {
      arr.push(row);
    }

    if (table === 'task_assignees') dedupeTaskAssignees();
    return true;
  }

  function rtRemove(table, row) {
    const arr = rtArray(table);
    if (!arr || !row) return false;
    const key = table === 'task_assignees' ? rtKey(row) : rtId(row);
    if (!key) return false;

    const before = arr.length;
    for (let index = arr.length - 1; index >= 0; index -= 1) {
      const itemKey = table === 'task_assignees' ? rtKey(arr[index]) : rtId(arr[index]);
      if (itemKey === key) arr.splice(index, 1);
    }
    return arr.length !== before;
  }

  function setRealtimeStatus(text) {
    S.rtText = text;
    const element = $('sideStatusText');
    if (element) {
      const base = String(element.textContent || '').replace(/ · Realtime:.*$/, '');
      element.textContent = `${base} · Realtime: ${text}`;
    }
  }

  function scheduleRealtimeRender(reason) {
    scheduleRender(reason || 'realtime');
    if (reason && String(reason).includes('task_comments')) {
      requestAnimationFrame(() => {
        try { renderTaskCommentsModal(); }
        catch (_) {}
      });
    }
  }

  function handleRealtimePayload(table, payload) {
    try {
      S.rtLastEvent = Date.now();
      const eventType = payload.eventType;
      const row = eventType === 'DELETE' ? (payload.old || {}) : (payload.new || {});
      const changed = eventType === 'DELETE' ? rtRemove(table, row) : rtUpsert(table, row);
      if (changed) {
        setRealtimeStatus(`синхронизировано ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        scheduleRealtimeRender(`${table}:${eventType}`);
      }
    } catch (error) {
      console.warn('[realtime] payload error', table, error);
    }
  }

  function teardownRealtime() {
    try { removeRealtimeChannel(S.sb, S.rtChannel); }
    catch (_) {}
    S.rtChannel = null;
    S.rtStatus = 'closed';
  }

  async function softRealtimeSync() {
    if (S.rtSoftSyncing) return;
    S.rtSoftSyncing = true;

    try {
      setRealtimeStatus('мягкая синхронизация');
      await loadTasksSafe({ silent: true });
      const snapshot = await fetchRealtimeSnapshot(S.sb, S.warnings);
      if (snapshot.projects.length) S.projects = snapshot.projects.filter((project) => !project.deleted_at);
      if (snapshot.users.length) S.users = snapshot.users;
      S.assignees = snapshot.assignees;
      dedupeTaskAssignees();
      S.subtasks = snapshot.subtasks;
      S.taskComments = snapshot.taskComments;
      setRealtimeStatus('подключён');
      scheduleRender('soft-sync');
    } catch (error) {
      console.warn('[realtime] soft sync failed', error);
      setRealtimeStatus('ошибка мягкой синхронизации');
    } finally {
      S.rtSoftSyncing = false;
    }
  }

  function setupRealtime() {
    if (!S.sb || !S.user) return;
    if (S.rtChannel && S.rtStatus === 'SUBSCRIBED') return;

    teardownRealtime();
    const channel = createWorkspaceRealtimeChannel(S.sb, 'workspace-realtime-v118', handleRealtimePayload);
    S.rtChannel = channel;
    S.rtStatus = 'connecting';
    setRealtimeStatus('подключение');

    channel.subscribe((status) => {
      S.rtStatus = status;
      if (status === 'SUBSCRIBED') setRealtimeStatus('подключён');
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        setRealtimeStatus('переподключение');
        clearTimeout(S.rtReconnectTimer);
        S.rtReconnectTimer = setTimeout(setupRealtime, 2500);
      }
    });

    if (!S.rtVisibilityHook) {
      S.rtVisibilityHook = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        const stale = !S.rtLastEvent || Date.now() - S.rtLastEvent > 5 * 60 * 1000;
        if (S.rtStatus !== 'SUBSCRIBED') {
          setupRealtime();
          softRealtimeSync();
        } else if (stale) {
          softRealtimeSync();
        }
      });
      window.addEventListener('online', () => {
        setupRealtime();
        softRealtimeSync();
      });
      window.addEventListener('beforeunload', teardownRealtime);
    }
  }

  return {
    setupRealtime,
    teardownRealtime,
    softRealtimeSync,
    rtUpsert,
    rtRemove,
    handleRealtimePayload,
    setRealtimeStatus
  };
}
