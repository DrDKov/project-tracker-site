const VAPID_PUBLIC_KEY = 'BGt-lAr2FfVJl3VeJ6StfS5j18oheuHA6bZIouhxDgSi2Owg0APEz0hwiw4UiFFQ_op1-avRrc4AjTzgynUdb_8';
const VERSION = '20260715-push-v3';
let registration = null;
let busy = false;
let connected = false;
let resolvedProfile = null;
let identityPromise = null;

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function base64UrlToBytes(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function profile() {
  try { return window.currentProfile || null; } catch (_) { return null; }
}

function client() {
  try { return window.sb || null; } catch (_) { return null; }
}

async function resolveProfile(force = false) {
  const direct = profile();
  if (direct?.id) {
    resolvedProfile = direct;
    return direct;
  }
  if (resolvedProfile?.id && !force) return resolvedProfile;
  const sb = client();
  if (!sb) return null;
  if (identityPromise && !force) return identityPromise;
  identityPromise = (async () => {
    const { data: profileId, error } = await sb.rpc('current_app_user_id');
    if (error) throw error;
    if (!profileId) return null;
    resolvedProfile = { id: profileId };
    return resolvedProfile;
  })();
  try { return await identityPromise; }
  finally { identityPromise = null; }
}

async function waitForProfile(timeout = 12000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeout) {
    try {
      const me = await resolveProfile();
      if (me?.id) return me;
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (lastError) throw lastError;
  return null;
}

function hasCurrentApplicationKey(subscription) {
  const actual = subscription?.options?.applicationServerKey;
  if (!actual) return true;
  const current = new Uint8Array(actual);
  const expected = base64UrlToBytes(VAPID_PUBLIC_KEY);
  return current.length === expected.length && current.every((value, index) => value === expected[index]);
}

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function ensureStyle() {
  if (document.getElementById('push-notification-style')) return;
  const style = document.createElement('style');
  style.id = 'push-notification-style';
  style.textContent = '.push-permission{margin:8px;padding:10px 11px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;display:flex;align-items:center;justify-content:space-between;gap:10px}.push-permission-text{min-width:0}.push-permission-text b{display:block;font-size:13px;color:#1e3a8a}.push-permission-text span{display:block;margin-top:2px;font-size:12px;color:#64748b}.push-permission button{flex:0 0 auto;min-height:36px;border:0;border-radius:11px;padding:0 12px;background:#0a84ff;color:#fff;font-size:12px;font-weight:800;cursor:pointer}.push-permission button[disabled]{background:#94a3b8;cursor:default}@media(max-width:720px){.push-permission{align-items:flex-start;flex-direction:column}.push-permission button{width:100%}}';
  document.head.appendChild(style);
}

function ensureUi() {
  ensureStyle();
  const panel = document.getElementById('assignmentPanel');
  if (!panel || document.getElementById('pushPermission')) return;
  const bar = document.createElement('div');
  bar.id = 'pushPermission';
  bar.className = 'push-permission';
  bar.innerHTML = '<div class="push-permission-text"><b id="pushPermissionTitle">Уведомления телефона</b><span id="pushPermissionText">Проверяю доступность…</span></div><button type="button" id="pushPermissionBtn">Включить</button>';
  const list = panel.querySelector('.assignment-list');
  panel.insertBefore(bar, list || null);
  bar.querySelector('button').addEventListener('click', enablePush);
  refreshUi();
}

async function saveSubscription(subscription, me, retry = true) {
  const sb = client();
  if (!sb) throw new Error('Подключение к базе ещё не готово');
  if (!me?.id) throw new Error('Профиль приложения не найден. Войдите заново.');
  const value = subscription.toJSON();
  if (!value.endpoint || !value.keys?.p256dh || !value.keys?.auth) {
    throw new Error('Браузер вернул неполную push-подписку');
  }
  const row = {
    user_id: me.id,
    endpoint: value.endpoint,
    p256dh: value.keys?.p256dh,
    auth: value.keys?.auth,
    expiration_time: value.expirationTime,
    user_agent: navigator.userAgent.slice(0, 500),
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    disabled_at: null,
  };
  const existing = await sb.from('push_subscriptions').select('id').eq('endpoint', row.endpoint).maybeSingle();
  if (existing.error) throw existing.error;
  const result = existing.data
    ? await sb.from('push_subscriptions').update(row).eq('id', existing.data.id)
    : await sb.from('push_subscriptions').insert(row);
  if (!result.error) {
    connected = true;
    return;
  }
  if (retry && result.error.code === '23505') {
    await subscription.unsubscribe();
    const replacement = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    });
    return saveSubscription(replacement, me, false);
  }
  throw result.error;
}

async function ensureSubscription(create, me) {
  if (!supported()) return false;
  registration ||= await navigator.serviceWorker.register('./sw.js?v=' + VERSION, { scope: './' });
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !hasCurrentApplicationKey(subscription)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription && create) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    });
  }
  if (!subscription) return false;
  await saveSubscription(subscription, me);
  return true;
}

async function enablePush() {
  if (busy) return;
  busy = true;
  let outcome = '';
  refreshUi('Подключаю…');
  try {
    if (!supported()) throw new Error('Этот браузер не поддерживает push-уведомления');
    const me = await waitForProfile();
    if (!me?.id) throw new Error('Профиль приложения не найден. Войдите заново.');
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Разрешение на уведомления не предоставлено');
    await ensureSubscription(true, me);
    outcome = 'Подключено';
  } catch (error) {
    console.warn('Push setup failed', error);
    outcome = error?.message || 'Не удалось подключить';
  } finally {
    busy = false;
    refreshUi(outcome);
  }
}

function refreshUi(override = '') {
  const title = document.getElementById('pushPermissionTitle');
  const text = document.getElementById('pushPermissionText');
  const button = document.getElementById('pushPermissionBtn');
  if (!title || !text || !button) return;
  if (override) text.textContent = override;
  if (!supported()) {
    text.textContent = 'Push-уведомления недоступны в этом браузере.';
    button.hidden = true;
    return;
  }
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone()) {
    text.textContent = 'Сначала добавьте приложение на экран «Домой».';
    button.hidden = true;
    return;
  }
  if (Notification.permission === 'denied') {
    text.textContent = 'Разрешите уведомления в настройках браузера.';
    button.textContent = 'Заблокировано';
    button.disabled = true;
    return;
  }
  if (Notification.permission === 'granted' && connected) {
    text.textContent = override || 'Системные уведомления включены.';
    button.textContent = 'Включено';
    button.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    text.textContent = override || 'Разрешение получено. Подключите телефон к профилю.';
    button.textContent = 'Подключить';
    button.disabled = busy;
    return;
  }
  text.textContent = override || 'Получайте назначения, даже когда приложение закрыто.';
  button.textContent = 'Включить';
  button.disabled = busy;
}

async function boot() {
  if (supported()) {
    try { registration = await navigator.serviceWorker.register('./sw.js?v=' + VERSION, { scope: './' }); }
    catch (error) { console.warn('Service worker registration failed', error); }
  }
  const timer = setInterval(async () => {
    ensureUi();
    if (!client()) return;
    let me = null;
    try { me = await resolveProfile(); }
    catch (error) { console.warn('Push profile lookup failed', error); }
    if (!me?.id) return;
    if (Notification.permission === 'granted') {
      try {
        await ensureSubscription(true, me);
        clearInterval(timer);
      } catch (error) { console.warn('Push restore failed', error); }
      refreshUi();
    }
  }, 1000);
  setTimeout(() => clearInterval(timer), 120000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

