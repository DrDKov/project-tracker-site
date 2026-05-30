import { expect, test } from '@playwright/test';
import { installSupabaseStub } from './supabase-stub.js';

test.beforeEach(async ({ page }) => {
  await installSupabaseStub(page);
});

test('loads the React application shell without a fatal module error', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.locator('.sidebar .brand h1')).toHaveText('Workspace');
  await expect(page.locator('.nav [data-view="tasks"]')).toBeVisible();
  await page.waitForFunction(() => window.__PT_APP_BOOTSTRAPPED__ === true);
  await page.waitForFunction(() => !!window.appStore?.getState);
  await expect(page.locator('#sideStatusText')).not.toContainText('Ошибка загрузки приложения');

  expect(consoleErrors.filter(text => text.includes('Workspace loader failed'))).toEqual([]);
});

test('exposes appStore and keeps legacy runtime API removed', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.appStore?.getState);

  const snapshot = await page.evaluate(() => ({
    hasStore: Boolean(window.appStore?.getState),
    hasLegacyRuntime: Boolean(window.__WorkspaceApp),
    modules: window.__PT_LOADED_MODULES__ || []
  }));

  expect(snapshot.hasStore).toBe(true);
  expect(snapshot.hasLegacyRuntime).toBe(false);
  expect(snapshot.modules).toContain('pwa');
});
