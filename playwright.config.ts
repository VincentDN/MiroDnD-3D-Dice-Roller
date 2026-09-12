import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.TEST_ORIGIN || 'http://127.0.0.1:8787',
    headless: true, trace: 'retain-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
});
