import { test, expect } from '@playwright/test';

test('switching JDK version lands on the same page', async ({ page }) => {
  await page.goto('/liberica-jdk/25.0.3b11/install-guide/');
  await page.selectOption('#version-select', '21.0.6b10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/install-guide\/?$/);
  await expect(page.locator('h1')).toContainText('21'); // URL above proves the exact slug
});

test('how-to pages are version-scoped: switching stays on the same page', async ({ page }) => {
  await page.goto('/liberica-jdk/25.0.3b11/how-to/crac/');
  await expect(page.locator('#version-select')).toHaveValue('25.0.3b11');
  await page.selectOption('#version-select', '21.0.6b10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/how-to\/crac\/?$/);
  await expect(page.locator('h1')).toContainText('CRaC');
});

test('product landing (no active version) defaults to latest and entering a version goes to its install guide', async ({
  page,
}) => {
  await page.goto('/liberica-nik/');
  await expect(page.locator('#version-select')).toHaveValue('25.0.3b11');
  await page.selectOption('#version-select', '21.0.6b10');
  await expect(page).toHaveURL(/\/liberica-nik\/21\.0\.6b10\/install-guide\/?$/);
});

test('the selector is absent on non-versioned products', async ({ page }) => {
  await page.goto('/containers/');
  await expect(page.locator('#version-select')).toHaveCount(0);
});

test('product switcher and active-version-only sidebar render together', async ({ page }) => {
  await page.goto('/liberica-jdk/25.0.3b11/install-guide/');
  const sidebar = page.locator('#starlight__sidebar');
  // Product switcher (topics) is present — links to other products exist.
  await expect(sidebar.getByRole('link', { name: 'Native Image Kit' })).toBeVisible();
  // Active version group shows; the other version's group is filtered out.
  await expect(sidebar.getByText('25.0.3+11 (LTS)')).toBeVisible();
  await expect(sidebar.getByText('21.0.6+10 (LTS)')).toHaveCount(0);
});
