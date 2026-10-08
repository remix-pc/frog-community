import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 40000,
  use: { viewport: { width: 1280, height: 720 }, headless: true, launchOptions: existsSync(edge) ? { executablePath: edge } : {}, trace: 'retain-on-failure' }
});
