import { test as base, expect, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createGameServer } from '../../server/game';

const test = base.extend<{ fireflyGame: { url: string; expire: () => void } }>({
  fireflyGame: async ({}, use) => {
    const folder = await mkdtemp(join(tmpdir(), 'frog-firefly-browser-'));
    let offset = 0;
    const server = createGameServer({ scorePath: join(folder, 'scores.json'), arcadeNow: () => performance.now() + offset });
    try { await use({ url: `http://127.0.0.1:${await server.listen(0, '127.0.0.1')}`, expire: () => { offset += 60_000; } }); }
    finally { await server.close(); await rm(folder, { recursive: true, force: true }); }
  }
});
async function enter(page: Page, url: string) {
  await page.goto(url); await expect(page.locator('canvas[data-ready=true]')).toBeVisible();
  await page.getByLabel('Como podemos te chamar?').fill('Luz do Brejo');
  await page.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(page.locator('#entry')).toBeHidden();
}
async function walk(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas'), box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: x / 1200 * box.width, y: y / 800 * box.height } });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`Pega-Vagalumes e ranking compartilhado ${viewport.width}×${viewport.height}`, async ({ page, fireflyGame }, info) => {
    await page.setViewportSize(viewport); await enter(page, fireflyGame.url);
    await walk(page, 390, 530);
    await expect(page.locator('#firefly-invite')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`minifliperama-${viewport.width}.png`) });
    await page.locator('#firefly-invite [data-play]').click();
    await expect(page.locator('#firefly-dialog')).toBeVisible();
    await expect(page.locator('#firefly-dialog .firefly-board button')).toHaveCount(9);
    await page.locator('#firefly-dialog .firefly-board button.lit').click();
    await expect(page.locator('#firefly-dialog [data-score]')).toHaveText('10');
    await page.waitForTimeout(270);
    const next = Number(await page.locator('#firefly-dialog .firefly-board button.lit').getAttribute('data-cell')) + 1;
    await page.keyboard.press(String(next));
    await expect(page.locator('#firefly-dialog [data-score]')).toHaveText('20');
    await page.screenshot({ path: info.outputPath(`vagalumes-jogando-${viewport.width}.png`) });
    fireflyGame.expire();
    await expect(page.locator('#firefly-dialog [data-status]')).toContainText('Tempo esgotado!');
    await expect(page.locator('#firefly-dialog [data-best]')).toHaveText('Seu recorde: 20 pontos');
    await expect(page.locator('#firefly-dialog [data-ranking]')).toContainText('Luz do Brejo');
    await page.getByRole('button', { name: 'Voltar ao brejo' }).click();
    await expect(page.locator('#firefly-dialog')).toBeHidden();
  });
}

test('a praça muda do dia para a noite com a página aberta', async ({ page, fireflyGame }, info) => {
  await page.clock.install({ time: new Date('2026-10-09T20:59:50Z') });
  await enter(page, fireflyGame.url);
  await expect(page.locator('canvas[data-time-of-day=day]')).toBeVisible();
  await expect(page.locator('#world-time-label')).toContainText('dia');
  await page.screenshot({ path: info.outputPath('praca-dia.png') });
  await page.clock.runFor(31_000);
  await expect(page.locator('canvas[data-time-of-day=night]')).toBeVisible();
  await expect(page.locator('#world-time-label')).toContainText('noite');
  await expect(page.locator('.world-panel')).toHaveCSS('background-color', 'rgb(105, 134, 109)');
  await page.screenshot({ path: info.outputPath('praca-noite.png') });
  await page.clock.setFixedTime(new Date('2026-10-10T09:00:00Z'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('canvas[data-time-of-day=day]')).toBeVisible();
  await expect(page.locator('#world-time-label')).toContainText('dia');
});
