import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  webServer: {
    command: 'bun run build && bun run preview',
    url: 'http://localhost:4321/',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://localhost:4321' },
});
