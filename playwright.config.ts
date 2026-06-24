import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  webServer: {
    command: 'bun run build && bun run preview',
    url: 'http://localhost:4321/bellsoft-docs/',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  // The site is served under the configured base; tests use base-relative
  // (no-leading-slash) goto paths, so this base is honored.
  use: { baseURL: 'http://localhost:4321/bellsoft-docs/' },
});
