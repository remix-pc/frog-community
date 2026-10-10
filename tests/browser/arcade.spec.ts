import { test as base, expect, type Page } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createGameServer } from '../../server/game';

const test = base.extend<{ arcadeGame: { server: ReturnType<typeof createGameServer>; url: string; expire: () => void } }>({
  arcadeGame: async ({}, use, info) => {
    const folder = await mkdtemp(join(tmpdir(), 'frog-arcade-browser-'));
    let offset = 0;
    const server = createGameServer({ scorePath: join(folder, 'scores.json'), arcadeNow: () => performance.now() + offset });
    const events: unknown[] = [];
    server.io.on('connection', socket => {
      socket.onAny((event, ...args) => { if (event.startsWith('arcade:')) events.push({ at: performance.now(), direction: 'in', event, args }); });
      socket.onAnyOutgoing((event, ...args) => { if (event.startsWith('arcade:')) events.push({ at: performance.now(), direction: 'out', event, args }); });
    });
    try { await use({ server, url: `http://127.0.0.1:${await server.listen(0, '127.0.0.1')}`, expire: () => { offset += 60_000; } }); }
    finally {
      if (info.status !== info.expectedStatus) {
        await info.attach('arcade-events', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
        await info.attach('arcade-scores', { body: await readFile(join(folder, 'scores.json'), 'utf8').catch(error => String(error)), contentType: 'text/plain' });
      }
      await server.close(); await rm(folder, { recursive: true, force: true });
    }
  }
});
async function enter(page: Page, url: string, name: string) {
  await page.goto(url); await expect(page.locator('canvas[data-ready=true]')).toBeVisible();
  await page.getByLabel('Como podemos te chamar?').fill(name);
  await page.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(page.locator('#entry')).toBeHidden();
}
async function walk(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas'), box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: x / 1200 * box.width, y: y / 800 * box.height } });
}
async function open(page: Page) {
  await walk(page, 650, 220);
  await expect(page.locator('#arcade-invite')).toBeVisible();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await expect(page.locator('#arcade-dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saltar para a esquerda' })).toBeEnabled();
}
async function jump(page: Page, correct = true) {
  await expect(page.getByRole('button', { name: 'Saltar para a esquerda' })).toBeEnabled();
  const direction = await page.locator('.arcade-row').last().getAttribute('data-direction');
  const left = correct ? direction === 'left' : direction !== 'left';
  await page.keyboard.press(left ? 'ArrowLeft' : 'ArrowRight');
}
for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`convite, partida, ranking e retorno ${viewport.width}×${viewport.height}`, async ({ page, arcadeGame }, info) => {
    // The result must refresh even if its unsolicited ranking broadcast is lost.
    const adapter = arcadeGame.server.io.of('/').adapter;
    const broadcast = adapter.broadcast.bind(adapter);
    adapter.broadcast = (packet, options) => { if (packet.data?.[0] !== 'arcade:ranking') broadcast(packet, options); };
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport); await enter(page, arcadeGame.url, 'Saltador');
    await walk(page, 650, 220); await expect(page.locator('#arcade-invite')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`fliperama-no-brejo-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'Agora não' }).click(); await expect(page.locator('#arcade-invite')).toBeHidden();
    await page.waitForTimeout(500); await expect(page.locator('#arcade-invite')).toBeHidden();
    await walk(page, 650, 490); await page.waitForTimeout(900);
    await open(page);
    await expect(page.locator('.arcade-row')).toHaveCount(5);
    const firstDirection = await page.locator('.arcade-row').last().getAttribute('data-direction');
    await page.getByRole('button', { name: firstDirection === 'left' ? 'Saltar para a esquerda' : 'Saltar para a direita' }).click();
    await expect(page.locator('#arcade-dialog [data-score]')).toHaveText('10');
    await jump(page); await expect(page.locator('#arcade-dialog [data-score]')).toHaveText('20');
    await page.screenshot({ path: info.outputPath(`fliperama-jogando-${viewport.width}.png`) });
    await jump(page, false);
    await expect(page.locator('#arcade-dialog [data-status]')).toContainText('Splash! Você fez 20 pontos.');
    await expect(page.locator('#arcade-dialog [data-best]')).toHaveText('Seu recorde: 20 pontos', { timeout: 10000 });
    await expect(page.locator('#arcade-dialog [data-ranking]')).toContainText('Saltador');
    await expect(page.getByRole('button', { name: 'Jogar novamente' })).toBeFocused();
    await page.getByRole('button', { name: 'Sair do fliperama' }).focus();
    await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button', { name: 'Voltar ao brejo' })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Sair do fliperama' })).toBeFocused();
    const box = (await page.locator('#arcade-dialog').boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: info.outputPath(`fliperama-resultado-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'Jogar novamente' }).click();
    await expect(page.locator('#arcade-dialog [data-score]')).toHaveText('0');
    await page.keyboard.press('Escape'); await expect(page.locator('#arcade-dialog')).not.toBeVisible();
    await expect(page.getByLabel('Mensagem para a praça')).toBeFocused();
    await expect(page.locator('#arcade-invite')).toBeHidden();
    await page.getByLabel('Mensagem para a praça').fill('Voltei do fliperama!'); await page.keyboard.press('Enter');
    await expect(page.locator('.message p')).toHaveText('Voltei do fliperama!');
    expect(errors).toEqual([]);
  });
}
test('ranking ao vivo entre jogadores, fim por tempo e desconexão', async ({ browser, arcadeGame }) => {
  const ca = await browser.newContext(), cb = await browser.newContext();
  const a = await ca.newPage(), b = await cb.newPage();
  try {
    await enter(a, arcadeGame.url, 'Sapo Alfa'); await enter(b, arcadeGame.url, 'Sapo Beta');
    await Promise.all([open(a), open(b)]);
    await jump(a); await expect(a.locator('#arcade-dialog [data-score]')).toHaveText('10');
    arcadeGame.expire();
    await expect(a.locator('#arcade-dialog [data-status]')).toContainText('Tempo esgotado!');
    await expect(b.locator('#arcade-dialog [data-ranking]')).toContainText('Sapo Alfa');
    await expect(b.locator('#arcade-dialog [data-status]')).toContainText('Tempo esgotado!');
    await a.getByRole('button', { name: 'Jogar novamente' }).click();
    await expect(a.getByRole('button', { name: 'Saltar para a esquerda' })).toBeEnabled();
    const self = [...arcadeGame.server.io.sockets.sockets.values()][0]; self.conn.close();
    await expect(a.locator('#arcade-dialog')).not.toBeVisible();
    await expect(a.getByLabel('Mensagem para a praça')).toBeEnabled({ timeout: 10000 });
    await expect(a.locator('#arcade-invite')).toBeHidden();
  } finally { await ca.close(); await cb.close(); }
});
