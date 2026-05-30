import { createWorkspaceRealtimeSubscription, normalizeSupabaseRealtimePayload, removeWorkspaceRealtimeSubscription } from '../shared/realtime/realtimeClient';
import { dispatchWorkspaceRealtimeChange } from '../shared/realtime/realtimeEvents';

export function createRealtimeBridge(deps) {
  const { S, $ } = deps;

  function setRealtimeStatus(text) {
    S.rtText = text;
    const element = $('sideStatusText');
    if (element) {
      const base = String(element.textContent || '').replace(/ · Realtime:.*$/, '');
      element.textContent = `${base} · Realtime: ${text}`;
    }
  }

  function handleRealtimePayload(table, payload) {
    try {
      S.rtLastEvent = Date.now();
      const change = normalizeSupabaseRealtimePayload(table, payload);
      dispatchWorkspaceRealtimeChange(change);
      setRealtimeStatus(`событие ${String(change.eventType || '').toLowerCase()} · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    } catch (error) {
      console.warn('[realtime] payload error', table, error);
    }
  }

  function teardownRealtime() {
    try { removeWorkspaceRealtimeSubscription(S.sb, S.rtChannel); }
    catch (_) {}
    S.rtChannel = null;
    S.rtStatus = 'closed';
  }

  async function softRealtimeSync() {
    if (S.rtSoftSyncing) return;
    S.rtSoftSyncing = true;

    try {
      setRealtimeStatus('обновление данных');
      dispatchWorkspaceRealtimeChange({ table: 'workspace', eventType: 'SOFT_SYNC', source: 'soft-sync' });
      setRealtimeStatus('подключён');
    } catch (error) {
      console.warn('[realtime] soft sync failed', error);
      setRealtimeStatus('ошибка обновления');
    } finally {
      S.rtSoftSyncing = false;
    }
  }

  function setupRealtime() {
    if (!S.sb || !S.user) return;
    if (S.rtChannel && S.rtStatus === 'SUBSCRIBED') return;

    teardownRealtime();
    const channel = createWorkspaceRealtimeSubscription(S.sb, 'workspace-realtime-v126d', handleRealtimePayload);
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
    handleRealtimePayload,
    setRealtimeStatus
  };
}
