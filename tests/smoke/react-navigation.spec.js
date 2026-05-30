import { expect, test } from '@playwright/test';
import { installSupabaseStub } from './supabase-stub.js';

test.beforeEach(async ({ page }) => {
  await installSupabaseStub(page);
});

test('navigates between React pages through hash routes', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.appStore?.getState);

  await page.locator('.nav [data-view="tasks"]').click();
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.locator('.react-tasks-page')).toBeVisible();

  await page.locator('.nav [data-view="projects"]').click();
  await expect(page).toHaveURL(/#\/projects$/);
  await expect(page.locator('[data-route="projects"]')).toBeVisible();
});

test('loads owner-only navigation entries when stub profile is owner', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.appStore?.getState().profile);

  await expect(page.locator('.nav [data-view="materials"]')).toBeVisible();
  await page.locator('.nav [data-view="materials"]').click();
  await expect(page).toHaveURL(/#\/materials$/);
});
