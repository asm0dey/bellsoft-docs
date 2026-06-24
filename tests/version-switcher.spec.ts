import { test, expect } from '@playwright/test';

// The version picker is a searchable combobox: open it, then click the option.
async function pickVersion(page, label: string) {
  await page.locator('.version-current').click();
  await page.locator(`.version-option[data-label="${label}"]`).click();
}

test('switching JDK version lands on the same page', async ({ page }) => {
  await page.goto('liberica-jdk/25.0.3b11/install-guide/');
  await expect(page.locator('.version-current-label')).toHaveText('25.0.3+11');
  await pickVersion(page, '21.0.6+10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/install-guide\/?$/);
  await expect(page.locator('h1')).toContainText('21');
});

test('how-to pages are version-scoped: switching stays on the same page', async ({ page }) => {
  await page.goto('liberica-jdk/25.0.3b11/how-to/crac/');
  await pickVersion(page, '21.0.6+10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/how-to\/crac\/?$/);
  await expect(page.locator('h1')).toContainText('CRaC');
});

test('container pages are version-scoped: switching stays on the same page', async ({ page }) => {
  await page.goto('liberica-jdk/25.0.3b11/containers/usage/');
  await pickVersion(page, '21.0.6+10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/containers\/usage\/?$/);
});

test('the searchable picker filters versions', async ({ page }) => {
  await page.goto('liberica-jdk/25.0.3b11/install-guide/');
  await page.locator('.version-current').click();
  await page.locator('.version-search').fill('21');
  await expect(page.locator('.version-option:visible')).toHaveCount(1);
  await expect(page.locator('.version-option:visible')).toHaveText('21.0.6+10');
});

test('the version picker is absent on non-versioned products and product landings', async ({
  page,
}) => {
  await page.goto('alpaquita/');
  await expect(page.locator('.version-picker')).toHaveCount(0);
  await page.goto('liberica-nik/');
  await expect(page.locator('.version-picker')).toHaveCount(0);
});

test('product switcher and active-version-only sidebar render together', async ({ page }) => {
  await page.goto('liberica-jdk/25.0.3b11/install-guide/');
  const sidebar = page.locator('#starlight__sidebar');
  await expect(sidebar.getByRole('link', { name: 'Native Image Kit' })).toBeVisible();
  await expect(sidebar.getByText('25.0.3+11 (LTS)')).toBeVisible();
  await expect(sidebar.getByText('21.0.6+10 (LTS)')).toHaveCount(0);
});
