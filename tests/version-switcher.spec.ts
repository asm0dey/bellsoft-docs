import { test, expect } from '@playwright/test';

test('switching JDK version lands on the same page', async ({ page }) => {
  await page.goto('/liberica-jdk/25.0.3b11/install-guide/');
  await page.selectOption('#version-select', '21.0.6b10');
  await expect(page).toHaveURL(/\/liberica-jdk\/21\.0\.6b10\/install-guide\/?$/);
  await expect(page.locator('h1')).toContainText('21'); // URL above proves the exact slug
});

test('no version dropdown on shared how-to pages', async ({ page }) => {
  await page.goto('/liberica-jdk/how-to/ide/');
  await expect(page.locator('#version-select')).toHaveCount(0);
});
