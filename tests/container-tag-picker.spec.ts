import { test, expect } from '@playwright/test';

const TAGS = '/liberica-jdk/25.0.3b11/containers/tags/';

test('tag picker builds a docker pull command from the selections', async ({ page }) => {
  await page.goto(TAGS);
  const pull = page.locator('.tag-pull');
  // Default: Full JDK / 21 / glibc
  await expect(pull).toContainText('bellsoft/liberica-runtime-container:jdk-all-21-glibc');
  await expect(page.locator('.tag-status')).toContainText('published');

  // Toggling an option and changing selects rebuilds the tag reactively.
  await page.locator('[data-flag="slim"]').check();
  await expect(pull).toContainText('jdk-all-21-slim-glibc');

  await page.locator('[data-field="type"]').selectOption('jre');
  await page.locator('[data-field="libc"]').selectOption('musl');
  await page.locator('[data-field="version"]').selectOption('17');
  await expect(pull).toContainText('jre-17-slim-musl');
});

test('tag picker flags an unpublished combination', async ({ page }) => {
  await page.goto(TAGS);
  // Stack every option on an old line that does not publish them all.
  await page.locator('[data-field="version"]').selectOption('8');
  for (const f of ['crac', 'cds', 'slim', 'stream']) {
    await page.locator(`[data-flag="${f}"]`).check();
  }
  await expect(page.locator('.tag-status')).toContainText('not published');
});
