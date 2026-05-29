import { expect, test } from '@playwright/test';

const SUPABASE_STUB = `
(function(){
  function rows(data){
    const chain = {
      data,
      error: null,
      select(){ return chain; },
      insert(){ return chain; },
      update(){ return chain; },
      upsert(){ return chain; },
      delete(){ return chain; },
      eq(){ return chain; },
      neq(){ return chain; },
      is(){ return chain; },
      in(){ return chain; },
      or(){ return chain; },
      gte(){ return chain; },
      lte(){ return chain; },
      order(){ return chain; },
      limit(){ return chain; },
      range(){ return chain; },
      maybeSingle: async () => ({ data: data?.[0] || null, error: null }),
      single: async () => ({ data: data?.[0] || null, error: null }),
      then(resolve){ resolve({ data, error: null }); }
    };
    return chain;
  }
  function client(){
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
      },
      from: () => rows([]),
      rpc: async () => ({ data: null, error: null }),
      channel: () => ({ on(){ return this; }, subscribe(){ return this; }, unsubscribe(){} }),
      removeChannel: async () => {}
    };
  }
  window.supabase = { createClient: client };
})();
`;

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', async route => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: SUPABASE_STUB });
  });
});

test('loads the application shell without a fatal module error', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.locator('.sidebar .brand h1')).toHaveText('Workspace');
  await expect(page.locator('.nav [data-view="tasks"]')).toBeVisible();
  await page.waitForFunction(() => window.__PT_APP_BOOTSTRAPPED__ === true);
  await page.waitForFunction(() => Array.isArray(window.__PT_LOADED_MODULES__) && window.__PT_LOADED_MODULES__.includes('runtime'));
  await expect(page.locator('#sideStatusText')).not.toContainText('Ошибка загрузки приложения');

  expect(consoleErrors.filter(text => text.includes('Workspace loader failed'))).toEqual([]);
});

test('exposes the runtime API and default overview state', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__WorkspaceApp?.store);

  const snapshot = await page.evaluate(() => ({
    view: window.__WorkspaceApp.view,
    hasStore: Boolean(window.__WorkspaceApp.store?.getState),
    modules: window.__PT_LOADED_MODULES__
  }));

  expect(snapshot.view).toBe('overview');
  expect(snapshot.hasStore).toBe(true);
  expect(snapshot.modules).toContain('runtime');
});
