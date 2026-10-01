(function () {
  'use strict';
  if (window.__PT_ANNOUNCEMENTS_V1__) return;
  window.__PT_ANNOUNCEMENTS_V1__ = true;

  const byId = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state = { session: '', generation: 0, history: [], historyLimit: 20, draftId: null, busy: false, loadingHistory: false, current: null, pending: null, dialog: null, acknowledging: false, checked: false, checking: false };
  const profile = () => window.currentProfile;
  const isOwner = () => profile()?.role === 'owner';
  const client = () => window.sb;
  const date = value => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const receiptKey = (userId, announcementId) => 'pt_announcement_seen:' + userId + ':' + announcementId;

  function setStatus(message, error = false) {
    const status = byId('announcementEditorStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', error);
  }

  function ensurePanel() {
    const grid = document.querySelector('#settings .settings-grid');
    if (!grid || byId('workspaceAnnouncementsPanel')) return;
    const panel = document.createElement('section');
    panel.id = 'workspaceAnnouncementsPanel';
    panel.className = 'panel announcements-panel hidden';
    panel.innerHTML = '<div class="panel-head"><div><span class="announcement-eyebrow">ДЛЯ ВЛАДЕЛЬЦА</span><h3>Анонсы</h3><p class="muted">Расскажите команде, что нового. Каждый участник увидит опубликованный анонс один раз при следующем запуске.</p></div><span class="announcement-panel-icon" aria-hidden="true">✦</span></div><form id="announcementForm"><label for="announcementTitle">Заголовок</label><input class="input" id="announcementTitle" maxlength="120" placeholder="Что нового в workspace" required><label for="announcementBody">Текст объявления</label><textarea class="input" id="announcementBody" maxlength="10000" rows="6" placeholder="Новые возможности, важные изменения или новости команды…" required></textarea><div class="announcement-editor-actions"><button class="btn secondary" type="button" id="announcementPreviewBtn">Предпросмотр</button><button class="btn secondary" type="button" id="announcementSaveDraftBtn">Сохранить черновик</button><button class="btn primary" type="submit" id="announcementPublishBtn">Опубликовать</button></div><p class="announcement-editor-status muted" id="announcementEditorStatus" role="status" aria-live="polite"></p></form><div class="announcement-history-head"><h4>История анонсов</h4><button class="btn sm secondary" id="announcementNewBtn" type="button">Новый анонс</button></div><div id="announcementHistory" class="announcement-history"></div><button class="btn secondary announcement-load-more hidden" type="button" id="announcementLoadMoreBtn">Показать ещё</button>';
    grid.appendChild(panel);
    byId('announcementPreviewBtn').addEventListener('click', () => {
      const draft = readDraft();
      if (draft) openAnnouncement(draft, true);
    });
    byId('announcementSaveDraftBtn').addEventListener('click', () => runEditor(false));
    byId('announcementForm').addEventListener('submit', event => { event.preventDefault(); runEditor(true); });
    byId('announcementNewBtn').addEventListener('click', resetEditor);
    byId('announcementLoadMoreBtn').addEventListener('click', () => { state.historyLimit += 20; loadHistory(); });
    byId('announcementHistory').addEventListener('click', event => {
      const button = event.target.closest('[data-announcement-action]');
      if (!button || !isOwner() || state.busy) return;
      const item = state.history.find(row => row.id === button.dataset.id);
      if (!item) return;
      if (button.dataset.announcementAction === 'preview') { openAnnouncement(item, true); return; }
      state.draftId = item.published_at ? null : item.id;
      byId('announcementTitle').value = item.title;
      byId('announcementBody').value = item.body;
      setStatus(item.published_at ? 'Копия анонса. После публикации она появится у участников как новое объявление.' : 'Редактирование сохранённого черновика.');
      byId('announcementTitle').focus();
    });
  }

  function resetEditor() {
    if (state.busy) return;
    state.draftId = null;
    byId('announcementForm')?.reset();
    setStatus('');
  }

  function readDraft() {
    const title = byId('announcementTitle')?.value.trim() || '';
    const body = byId('announcementBody')?.value.trim() || '';
    if (!title || !body) { setStatus('Добавьте заголовок и текст объявления.', true); (!title ? byId('announcementTitle') : byId('announcementBody'))?.focus(); return null; }
    return { title, body };
  }

  function setEditorBusy(busy) {
    state.busy = busy;
    byId('announcementForm')?.querySelectorAll('button,input,textarea').forEach(element => { element.disabled = busy; });
    const button = byId('announcementNewBtn');
    if (button) button.disabled = busy;
  }

  async function saveDraft(draft) {
    const values = { ...draft, updated_at: new Date().toISOString() };
    let query = client().from('workspace_announcements');
    const response = state.draftId
      ? await query.update(values).eq('id', state.draftId).is('published_at', null).select('*').single()
      : await query.insert({ ...values, created_by: profile().id }).select('*').single();
    if (response.error) throw response.error;
    if (!response.data) throw new Error('Не удалось сохранить анонс.');
    state.draftId = response.data.id;
    return response.data;
  }

  async function runEditor(publish) {
    if (state.busy || !isOwner()) return;
    const draft = readDraft();
    if (!draft) return;
    const session = state.session;
    setEditorBusy(true);
    setStatus(publish ? 'Публикуем анонс…' : 'Сохраняем черновик…');
    try {
      const saved = await saveDraft(draft);
      if (session !== state.session) return;
      if (publish) {
        const response = await client().rpc('publish_workspace_announcement', { p_announcement_id: saved.id });
        if (response.error) throw response.error;
        if (!response.data) throw new Error('Не удалось опубликовать анонс.');
        state.current = Array.isArray(response.data) ? response.data[0] : response.data;
        state.draftId = null;
        byId('announcementForm').reset();
        setStatus('Анонс опубликован. Участники увидят его при следующем запуске приложения.');
      } else setStatus('Черновик сохранён. Участники пока его не видят.');
      await loadHistory();
    } catch (error) {
      if (session === state.session) setStatus('Не удалось ' + (publish ? 'опубликовать' : 'сохранить') + ' анонс: ' + (error.message || error), true);
    } finally { if (session === state.session) setEditorBusy(false); }
  }

  function renderHistory() {
    const box = byId('announcementHistory');
    if (!box) return;
    box.innerHTML = state.history.length ? state.history.map(item => '<article class="announcement-history-item"><div><span class="announcement-history-badge ' + (item.published_at ? 'published' : 'draft') + '">' + (item.published_at ? 'Опубликован' : 'Черновик') + '</span><time>' + escape(date(item.published_at || item.updated_at || item.created_at)) + '</time><h5>' + escape(item.title) + '</h5><p>' + escape(item.body) + '</p></div><div class="announcement-history-actions"><button class="btn sm secondary" type="button" data-announcement-action="preview" data-id="' + escape(item.id) + '">Посмотреть</button><button class="btn sm secondary" type="button" data-announcement-action="edit" data-id="' + escape(item.id) + '">' + (item.published_at ? 'Создать копию' : 'Редактировать') + '</button></div></article>').join('') : '<p class="muted announcement-history-empty">Анонсов пока нет. Создайте первое объявление для команды.</p>';
    byId('announcementLoadMoreBtn')?.classList.toggle('hidden', state.history.length < state.historyLimit);
  }

  async function loadHistory() {
    if (!isOwner() || !client() || state.loadingHistory) return;
    const generation = state.generation;
    state.loadingHistory = true;
    try {
      const response = await client().from('workspace_announcements').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(state.historyLimit);
      if (generation !== state.generation) return;
      if (response.error) throw response.error;
      state.history = response.data || [];
      renderHistory();
    } catch (error) { if (generation === state.generation) setStatus('Не удалось загрузить историю: ' + (error.message || error), true); }
    finally { if (generation === state.generation) state.loadingHistory = false; }
  }

  function ensureDialog() {
    if (byId('workspaceAnnouncementDialog')) return byId('workspaceAnnouncementDialog');
    const dialog = document.createElement('dialog');
    dialog.id = 'workspaceAnnouncementDialog';
    dialog.className = 'announcement-dialog';
    dialog.setAttribute('aria-labelledby', 'announcementScreenTitle');
    dialog.innerHTML = '<div class="announcement-hero" aria-hidden="true"><div class="announcement-orbit orbit-one"></div><div class="announcement-orbit orbit-two"></div><div class="announcement-hero-symbol">✦</div><span class="announcement-spark spark-one">✧</span><span class="announcement-spark spark-two">✦</span><span class="announcement-spark spark-three">✧</span></div><div class="announcement-screen-content"><div class="announcement-screen-meta"><span class="announcement-eyebrow" id="announcementScreenLabel">НОВОСТИ WORKSPACE</span><time id="announcementScreenDate"></time></div><h2 id="announcementScreenTitle"></h2><div id="announcementScreenBody" class="announcement-screen-body"></div><p class="announcement-screen-error" id="announcementScreenError" role="status"></p></div><div class="announcement-screen-footer"><button class="btn primary" id="announcementAcknowledgeBtn" type="button">Круто</button><p id="announcementScreenHint">Это объявление больше не появится после закрытия.</p></div>';
    document.body.appendChild(dialog);
    byId('announcementAcknowledgeBtn').addEventListener('click', acknowledge);
    dialog.addEventListener('cancel', event => { event.preventDefault(); acknowledge(); });
    dialog.addEventListener('close', () => { state.dialog = null; tryPending(); });
    return dialog;
  }

  function openAnnouncement(item, preview = false) {
    const dialog = ensureDialog();
    if (dialog.open) return;
    state.dialog = { item, preview, userId: profile()?.id, session: state.session };
    byId('announcementScreenTitle').textContent = item.title;
    byId('announcementScreenBody').textContent = item.body;
    byId('announcementScreenLabel').textContent = preview ? 'ПРЕДПРОСМОТР АНОНСА' : 'НОВОСТИ WORKSPACE';
    byId('announcementScreenDate').textContent = item.published_at ? date(item.published_at) : '';
    byId('announcementScreenHint').textContent = preview ? 'Так участники увидят ваше объявление.' : 'Это объявление больше не появится после закрытия.';
    byId('announcementScreenError').textContent = '';
    byId('announcementAcknowledgeBtn').disabled = false;
    byId('announcementAcknowledgeBtn').textContent = 'Круто';
    dialog.showModal();
  }

  async function acknowledge() {
    const shown = state.dialog;
    if (!shown || state.acknowledging) return;
    const dialog = byId('workspaceAnnouncementDialog');
    if (shown.preview) { dialog.close(); return; }
    state.acknowledging = true;
    byId('announcementAcknowledgeBtn').disabled = true;
    byId('announcementScreenError').textContent = '';
    try {
      const response = await client().from('workspace_announcement_reads').upsert({ user_id: shown.userId, announcement_id: shown.item.announcement_id }, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true });
      if (response.error) throw response.error;
      if (shown.session !== state.session) return;
      try { localStorage.setItem(receiptKey(shown.userId, shown.item.announcement_id), '1'); } catch {}
      dialog.close();
    } catch (error) {
      if (shown.session === state.session) byId('announcementScreenError').textContent = 'Не удалось сохранить просмотр. Нажмите «Круто» ещё раз.';
    } finally {
      state.acknowledging = false;
      if (shown.session === state.session) byId('announcementAcknowledgeBtn').disabled = false;
    }
  }

  function tryPending() {
    if (!state.pending || state.dialog || document.visibilityState === 'hidden' || document.querySelector('dialog[open]')) return;
    const item = state.pending;
    state.pending = null;
    openAnnouncement(item);
  }

  async function checkCurrent(generation) {
    if (state.checking) return;
    state.checking = true;
    try {
      const response = await client().from('workspace_announcement_current').select('*').eq('singleton', true).maybeSingle();
      if (generation !== state.generation) return;
      if (response.error) throw response.error;
      const item = response.data;
      state.current = item;
      if (!item) { state.checked = true; return; }
      const userId = profile().id;
      const receipt = await client().from('workspace_announcement_reads').select('announcement_id').eq('user_id', userId).eq('announcement_id', item.announcement_id).maybeSingle();
      if (generation !== state.generation) return;
      if (receipt.error) {
        let cached = false;
        try { cached = localStorage.getItem(receiptKey(userId, item.announcement_id)) === '1'; } catch {}
        if (!cached) throw receipt.error;
        state.checked = true;
        return;
      }
      state.checked = true;
      if (receipt.data) return;
      state.pending = item;
      tryPending();
    } catch (error) {
      if (generation === state.generation) console.warn('[announcements] Unable to check announcement', error.message || error);
    } finally { if (generation === state.generation) state.checking = false; }
  }

  function syncSession() {
    ensurePanel();
    const currentProfile = profile();
    const session = window.currentAuth?.id && currentProfile?.id && client() ? window.currentAuth.id + ':' + currentProfile.id + ':' + currentProfile.role : '';
    byId('workspaceAnnouncementsPanel')?.classList.toggle('hidden', !session || !isOwner());
    if (session === state.session) return;
    state.session = session;
    state.generation++;
    state.history = [];
    state.historyLimit = 20;
    state.draftId = null;
    state.pending = null;
    state.current = null;
    state.checked = false;
    state.checking = false;
    state.busy = false;
    state.loadingHistory = false;
    byId('workspaceAnnouncementDialog')?.close();
    byId('announcementForm')?.reset();
    setEditorBusy(false);
    setStatus('');
    renderHistory();
    if (!session) return;
    checkCurrent(state.generation);
    if (isOwner()) loadHistory();
  }

  function boot() {
    syncSession();
    new MutationObserver(syncSession).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('close', tryPending, true);
    document.addEventListener('visibilitychange', () => { syncSession(); tryPending(); });
    const retryOnReturn = () => { syncSession(); if (state.session && !state.checked) checkCurrent(state.generation); tryPending(); };
    window.addEventListener('focus', retryOnReturn);
    window.addEventListener('online', retryOnReturn);
    window.addEventListener('storage', event => {
      if (event.newValue !== '1') return;
      const shown = state.dialog;
      if (shown && !shown.preview && event.key === receiptKey(shown.userId, shown.item.announcement_id)) byId('workspaceAnnouncementDialog')?.close();
      if (state.pending && event.key === receiptKey(profile()?.id, state.pending.announcement_id)) state.pending = null;
    });
    client()?.auth?.onAuthStateChange(() => setTimeout(syncSession, 0));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();
