import { test as base, expect, type Page } from '@playwright/test';
import { createGameServer } from '../../server/game';
import { CINEMA_SEATS, PORTALS } from '../../shared/cinema';

const test = base.extend<{ cinemaGame: { server: ReturnType<typeof createGameServer>; url: string } }>({
  cinemaGame: async ({}, use) => {
    const server = createGameServer();
    try { await use({ server, url: `http://127.0.0.1:${await server.listen(0, '127.0.0.1')}` }); }
    finally { await server.close(); }
  }
});
async function enter(page: Page, url: string, nickname: string) {
  await page.clock.install({ time: new Date('2026-10-10T15:00:00Z') });
  await page.goto(url); await expect(page.locator('canvas[data-ready=true]')).toBeVisible();
  await page.getByLabel('Como podemos te chamar?').fill(nickname);
  await page.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(page.locator('#entry')).toBeHidden();
}
async function clickWorld(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas'), bounds = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: x / 1200 * bounds.width, y: y / 800 * bounds.height } });
}
async function cinema(page: Page) {
  await clickWorld(page, PORTALS.plaza.point.x, PORTALS.plaza.point.y - 30);
  await expect(page.locator('canvas')).toHaveAttribute('data-map-id', 'cinema', { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Cinema do Brejo' })).toBeVisible();
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`cinema, assentos e conversa local ${viewport.width}×${viewport.height}`, async ({ browser, cinemaGame }, info) => {
    const ca = await browser.newContext({ viewport }), cb = await browser.newContext({ viewport });
    const a = await ca.newPage(), b = await cb.newPage(), errors: string[] = [];
    a.on('pageerror', e => errors.push(e.message)); b.on('pageerror', e => errors.push(e.message));
    try {
      await enter(a, cinemaGame.url, 'Cine Sapo'); await enter(b, cinemaGame.url, 'Cine Amiga');
      await a.getByLabel('Mensagem para a praça').fill('Ficou na praça');
      await a.getByLabel('Mensagem para a praça').press('Enter');
      await expect(b.locator('.message p')).toHaveText('Ficou na praça');
      await cinema(a);
      await expect(a.locator('#people-count')).toHaveText('1'); await expect(b.locator('#people-count')).toHaveText('1');
      await expect(a.locator('.message p')).toHaveCount(0);
      await a.getByLabel('Mensagem para o cinema').fill('Bem-vindos ao cinema');
      await a.getByLabel('Mensagem para o cinema').press('Enter');
      await expect(a.locator('.message p')).toHaveText('Bem-vindos ao cinema');
      await expect(b.locator('.message p')).toHaveText('Ficou na praça');
      await cinema(b); await expect(a.locator('#people-count')).toHaveText('2');
      await expect(b.locator('.message p')).toHaveText('Bem-vindos ao cinema');
      const seat = CINEMA_SEATS[2];
      await clickWorld(a, seat.x, seat.y);
      await expect(a.locator('canvas')).toHaveAttribute('data-seat-id', seat.id, { timeout: 8000 });
      await clickWorld(b, seat.x, seat.y);
      await expect(b.locator('#toast')).toContainText('ocupada ou reservada');
      await clickWorld(b, CINEMA_SEATS[3].x, CINEMA_SEATS[3].y);
      await expect(b.locator('canvas')).toHaveAttribute('data-seat-id', CINEMA_SEATS[3].id, { timeout: 8000 });
      await a.getByRole('button', { name: 'Personalizar sapo' }).click();
      await a.getByRole('button', { name: 'Roupas: Moletom' }).click();
      await a.getByRole('button', { name: 'Chapéus: Boné' }).click();
      await a.getByRole('button', { name: 'Salvar visual' }).click();
      await expect(a.locator('#appearance-dialog')).not.toBeVisible();
      await expect(a.locator('canvas')).toHaveAttribute('data-seat-id', seat.id);
      await a.screenshot({ path: info.outputPath(`cinema-dia-${viewport.width}.png`), animations: 'disabled' });
      await a.clock.setSystemTime(new Date('2026-10-11T01:00:00Z'));
      await a.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(a.locator('canvas')).toHaveAttribute('data-time-of-day', 'night');
      await a.waitForTimeout(1000);
      await a.screenshot({ path: info.outputPath(`cinema-noite-${viewport.width}.png`), animations: 'disabled' });
      await expect(a.locator('#arcade-invite')).toBeHidden(); await expect(a.locator('#firefly-invite')).toBeHidden();
      await clickWorld(a, 720, 680);
      await expect(a.locator('canvas')).toHaveAttribute('data-seat-id', '');
      await clickWorld(a, PORTALS.cinema.point.x, PORTALS.cinema.point.y - 30);
      await expect(a.locator('canvas')).toHaveAttribute('data-map-id', 'plaza', { timeout: 8000 });
      await expect(a.locator('.message p')).toHaveText('Ficou na praça');
      await expect(b.locator('#people-count')).toHaveText('1');
      expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
      expect(errors).toEqual([]);
    } finally { await ca.close(); await cb.close(); }
  });
}

test('reconexão do cinema retorna à praça e libera o assento', async ({ page, cinemaGame }) => {
  await enter(page, cinemaGame.url, 'Voltei do cinema'); await cinema(page);
  const seat = CINEMA_SEATS[20];
  await clickWorld(page, seat.x, seat.y);
  await expect(page.locator('canvas')).toHaveAttribute('data-seat-id', seat.id, { timeout: 6000 });
  const socket = [...cinemaGame.server.io.sockets.sockets.values()][0];
  socket.conn.close();
  await expect(page.locator('canvas')).toHaveAttribute('data-map-id', 'plaza', { timeout: 10000 });
  await expect(page.locator('canvas')).toHaveAttribute('data-seat-id', '');
  await expect(page.getByLabel('Mensagem para a praça')).toBeEnabled();
  await cinema(page); await clickWorld(page, seat.x, seat.y);
  await expect(page.locator('canvas')).toHaveAttribute('data-seat-id', seat.id, { timeout: 6000 });
});
