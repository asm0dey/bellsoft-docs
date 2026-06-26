import { test, expect } from '@playwright/test';

const TAGS = 'liberica-jdk/containers/tags/';

async function pickJavaVersion(page, value: string) {
  await page.locator('.tpv-current').click();
  await page.locator(`.tpv-option[data-value="${value}"]`).click();
}

test('tag picker builds a docker pull command from the selections', async ({ page }) => {
  await page.goto(TAGS);
  const pull = page.locator('.tag-pull');
  // Default: Full JDK / 21 (latest) / glibc
  await expect(pull).toContainText('bellsoft/liberica-runtime-container:jdk-all-21-glibc');
  await expect(page.locator('.tag-status')).toContainText('published');

  await page.locator('[data-flag="slim"]').check();
  await expect(pull).toContainText('jdk-all-21-slim-glibc');

  await page.locator('[data-field="type"]').selectOption('jre');
  await page.locator('[data-field="libc"]').selectOption('musl');
  await pickJavaVersion(page, '17');
  await expect(pull).toContainText('jre-17-slim-musl');
});

test('the version combobox is searchable and supports minor versions', async ({ page }) => {
  await page.goto(TAGS);
  await page.locator('.tpv-current').click();
  await page.locator('.tpv-search').fill('17.0');
  const visible = page.locator('.tpv-option:visible');
  await expect(visible.first()).toBeVisible();
  const minor = await visible.first().getAttribute('data-value');
  await visible.first().click();
  await expect(page.locator('.tag-pull')).toContainText(`jdk-all-${minor}-glibc`);
});

test('tag picker flags an unpublished combination', async ({ page }) => {
  await page.goto(TAGS);
  await pickJavaVersion(page, '8');
  for (const f of ['crac', 'cds', 'slim', 'stream']) {
    await page.locator(`[data-flag="${f}"]`).check();
  }
  await expect(page.locator('.tag-status')).toContainText('not published');
});
