import { test as base, expect, type Page } from '@playwright/test';
import { createGameServer } from '../../server/game';

const test = base.extend<{ localGame: { server: ReturnType<typeof createGameServer>; url: string } }>({
  localGame: async ({}, use) => {
    const server = createGameServer(); const port = await server.listen(0, '127.0.0.1');
    try { await use({ server, url: `http://127.0.0.1:${port}` }); } finally { await server.close(); }
  },
  baseURL: async ({ localGame }, use) => { await use(localGame.url); }
});

async function enter(page: Page, nickname: string) {
  await page.goto('/');
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible();
  await page.getByLabel('Como podemos te chamar?').fill(nickname);
  await expect(page.getByRole('button', { name: 'Entrar no brejo' })).toBeEnabled();
  await page.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(page.locator('#entry')).toBeHidden();
}
test('dois navegadores conversam, silenciam, validam nomes e voltam à praça', async ({ browser, localGame }, testInfo) => {
  const contextA = await browser.newContext({ baseURL: localGame.url }), contextB = await browser.newContext({ baseURL: localGame.url });
  const a = await contextA.newPage(), b = await contextB.newPage();
  const errors: string[] = [];
  a.on('pageerror', error => errors.push(error.message)); b.on('pageerror', error => errors.push(error.message));
  await enter(a, 'Sapão');
  await b.goto('/'); await b.getByLabel('Como podemos te chamar?').fill('Sapão'); await b.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(b.getByRole('alert')).toContainText('já está no brejo');
  await b.getByLabel('Como podemos te chamar?').fill('Lili'); await b.getByRole('button', { name: 'Lago', exact: true }).click(); await b.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(b.locator('#entry')).toBeHidden(); await expect(a.locator('#people-count')).toHaveText('2');
  const world = b.locator('canvas'), worldRect = (await world.boundingBox())!;
  await world.click({ position: { x: 720 / 1200 * worldRect.width, y: 530 / 800 * worldRect.height } });
  await b.waitForTimeout(1800);
  await a.getByLabel('Mensagem para a praça').fill('Olá, Lili!'); await a.getByLabel('Mensagem para a praça').press('Enter');
  await expect(b.locator('.message p').filter({ hasText: 'Olá, Lili!' })).toBeVisible();
  await b.getByLabel('Mensagem para a praça').fill('Oi, Sapão! Vamos explorar o brejo?'); await b.getByLabel('Mensagem para a praça').press('Enter');
  await expect(a.locator('.message p').filter({ hasText: 'Vamos explorar' })).toBeVisible();
  await a.screenshot({ path: testInfo.outputPath('conversa-dentro-do-jogo.png'), animations: 'disabled' });
  await b.waitForTimeout(1100);
  await b.getByLabel('Mensagem para a praça').fill('<img src=x onerror=alert(1)>'); await b.getByLabel('Mensagem para a praça').press('Enter');
  await expect(a.locator('.message p').filter({ hasText: '<img src=x onerror=alert(1)>' })).toBeVisible(); await expect(a.locator('.message p img')).toHaveCount(0);
  await a.getByRole('tab', { name: /Na praça/ }).click(); await a.getByRole('button', { name: 'Silenciar Lili' }).click(); await a.getByRole('tab', { name: 'Conversa' }).click();
  await expect(a.locator('.message p').filter({ hasText: '<img src=x' })).toHaveCount(0);
  await b.waitForTimeout(1100); await b.getByLabel('Mensagem para a praça').fill('Mensagem silenciada'); await b.getByLabel('Mensagem para a praça').press('Enter');
  await expect(b.locator('.message p').filter({ hasText: 'Mensagem silenciada' })).toBeVisible(); await expect(a.locator('.message p').filter({ hasText: 'Mensagem silenciada' })).toHaveCount(0);
  await a.getByRole('tab', { name: /Na praça/ }).click(); await a.getByRole('button', { name: 'Ouvir Lili' }).click(); await a.getByRole('tab', { name: 'Conversa' }).click(); await expect(a.locator('.message p').filter({ hasText: 'Mensagem silenciada' })).toBeVisible();
  await b.getByRole('button', { name: 'Sair da praça' }).click(); await expect(a.locator('#people-count')).toHaveText('1');
  await b.getByRole('button', { name: 'Entrar no brejo' }).click(); await expect(b.locator('#entry')).toBeHidden(); await expect(a.locator('#people-count')).toHaveText('2');
  await b.reload(); await expect(b.getByLabel('Como podemos te chamar?')).toHaveValue('Lili'); await expect(b.getByRole('button', { name: 'Lago', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await b.getByRole('button', { name: 'Entrar no brejo' }).click(); await expect(b.locator('#entry')).toBeHidden(); await expect(a.locator('#people-count')).toHaveText('2');
  expect(errors).toEqual([]); await contextA.close(); await contextB.close();
});
for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`interface e captura visual ${viewport.width}×${viewport.height}`, async ({ page, localGame }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize(viewport); await page.goto('/'); await expect(page.locator('canvas[data-ready="true"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`entrada-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
    await expect(page.getByRole('button', { name: 'Entrar no brejo' })).toBeInViewport();
    const optionBounds = await page.getByRole('button', { name: 'Roupas: Capa' }).boundingBox();
    const fieldBounds = await page.locator('.entry-fields').boundingBox();
    expect(optionBounds!.y + optionBounds!.height).toBeLessThanOrEqual(fieldBounds!.y + fieldBounds!.height);
    await page.getByLabel('Como podemos te chamar?').fill(`Sapo ${viewport.width}`); await page.getByRole('button', { name: 'Entrar no brejo' }).click(); await expect(page.locator('#entry')).toBeHidden();
    const canvas = page.locator('canvas'); const rect = (await canvas.boundingBox())!;
    const destinations: { x: number; y: number }[] = [];
    for (const socket of localGame.server.io.sockets.sockets.values()) socket.on('player:move', point => destinations.push(point));
    await canvas.click({ position: { x: 620 / 1200 * rect.width, y: 490 / 800 * rect.height } });
    await expect.poll(() => destinations.length).toBe(1);
    // Pointer coordinates are rounded to CSS pixels before Phaser rescales them.
    expect(Math.abs(destinations[0].x - 620)).toBeLessThan(2); expect(Math.abs(destinations[0].y - 490)).toBeLessThan(2);
    await page.waitForTimeout(1600);
    await page.getByLabel('Mensagem para a praça').fill('Que bom encontrar vocês por aqui!'); await page.getByLabel('Mensagem para a praça').press('Enter');
    await expect(page.locator('.message p').filter({ hasText: 'Que bom encontrar' })).toBeVisible();
    expect(destinations).toHaveLength(1);
    const bounds = await page.locator('.world-panel').boundingBox(), chatBounds = await page.locator('#game-chat').boundingBox();
    expect(chatBounds!.x).toBeGreaterThan(bounds!.x); expect(chatBounds!.y).toBeGreaterThan(bounds!.y);
    expect(chatBounds!.x + chatBounds!.width).toBeLessThan(bounds!.x + bounds!.width);
    expect(chatBounds!.y + chatBounds!.height).toBeLessThan(bounds!.y + bounds!.height);
    await page.getByRole('button', { name: 'Recolher histórico' }).click();
    await expect(page.locator('#chat-content')).toBeHidden(); await expect(page.getByLabel('Mensagem para a praça')).toBeVisible();
    await page.getByRole('button', { name: 'Expandir histórico' }).click();
    await expect(page.locator('#chat-content')).toBeVisible(); expect(destinations).toHaveLength(1);
    await page.screenshot({ path: testInfo.outputPath(`praca-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
    const fits = await page.evaluate(() => ({ width: document.documentElement.scrollWidth <= innerWidth, height: document.documentElement.scrollHeight <= innerHeight })); expect(fits).toEqual({ width: true, height: true });
    const input = await page.getByLabel('Mensagem para a praça').boundingBox(); expect(input!.y + input!.height).toBeLessThan(viewport.height);
    await page.getByRole('button', { name: 'Personalizar sapo' }).click();
    await page.getByRole('button', { name: 'Roupas: Jaqueta' }).click();
    await page.getByRole('button', { name: 'Óculos: Escuros' }).click();
    await page.getByRole('button', { name: 'Chapéus: Cartola' }).click();
    await expect(page.getByRole('button', { name: 'Salvar visual' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`editor-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    expect(errors).toEqual([]);
  });
}
test('reconecta automaticamente e sincroniza uma única identidade', async ({ page, localGame }) => {
  await enter(page, 'Voltei');
  const previousId = [...localGame.server.io.sockets.sockets.keys()][0];
  localGame.server.io.sockets.sockets.get(previousId)!.conn.close();
  await expect(page.getByLabel('Mensagem para a praça')).toBeDisabled();
  await expect(page.getByLabel('Mensagem para a praça')).toBeEnabled({ timeout: 10000 });
  await expect(page.locator('#entry')).toBeHidden(); await expect(page.locator('#people-count')).toHaveText('1');
  await expect(page.locator('#self-name')).toHaveText('Voltei');
  const ids = [...localGame.server.io.sockets.sockets.keys()]; expect(ids).toHaveLength(1); expect(ids[0]).not.toBe(previousId);
  await page.getByLabel('Mensagem para a praça').fill('Voltei ao brejo!'); await page.getByLabel('Mensagem para a praça').press('Enter'); await expect(page.locator('.message p')).toHaveText('Voltei ao brejo!');
});

test('personaliza antes de entrar e atualiza os outros apenas ao salvar', async ({ browser, localGame }, testInfo) => {
  const contextA = await browser.newContext({ baseURL: localGame.url });
  const contextB = await browser.newContext({ baseURL: localGame.url });
  const a = await contextA.newPage(), b = await contextB.newPage();
  await a.goto('/');
  const initialPreview = await a.locator('#frog-preview').getAttribute('src');
  await a.getByRole('button', { name: 'Roupas: Camiseta' }).click();
  await a.getByRole('tab', { name: 'Óculos' }).click();
  await a.getByRole('button', { name: 'Óculos: Redondos' }).click();
  await a.getByRole('tab', { name: 'Chapéus' }).click();
  await a.getByRole('button', { name: 'Chapéus: Boné' }).click();
  const firstLook = await a.locator('#frog-preview').getAttribute('src');
  expect(firstLook).not.toBe(initialPreview);
  await a.getByLabel('Como podemos te chamar?').fill('Sapão');
  await a.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(a.locator('#entry')).toBeHidden();
  await enter(b, 'Lili');
  await b.getByRole('tab', { name: /Na praça/ }).click();
  const otherAvatar = b.locator('#people-list li').filter({ hasText: 'Sapão' }).locator('img');
  await expect(otherAvatar).toHaveAttribute('src', firstLook!);
  await a.getByRole('button', { name: 'Personalizar sapo' }).click();
  await a.getByRole('button', { name: 'Roupas: Capa' }).click();
  await a.getByRole('button', { name: 'Óculos: Coração' }).click();
  await a.getByRole('button', { name: 'Chapéus: Coroa' }).click();
  const secondLook = await a.locator('#appearance-preview-image').getAttribute('src');
  expect(secondLook).not.toBe(firstLook);
  await expect(otherAvatar).toHaveAttribute('src', firstLook!);
  await a.getByRole('button', { name: 'Cancelar' }).click();
  await expect(a.locator('#appearance-dialog')).toBeHidden();
  await expect(a.locator('#self-avatar')).toHaveAttribute('src', firstLook!);
  await a.getByRole('button', { name: 'Personalizar sapo' }).click();
  await a.getByRole('button', { name: 'Roupas: Capa' }).click();
  await a.getByRole('button', { name: 'Óculos: Coração' }).click();
  await a.getByRole('button', { name: 'Chapéus: Coroa' }).click();
  await a.getByRole('button', { name: 'Salvar visual' }).click();
  await expect(a.locator('#appearance-dialog')).toBeHidden();
  await expect(a.locator('#self-avatar')).toHaveAttribute('src', secondLook!);
  await expect(otherAvatar).toHaveAttribute('src', secondLook!);
  await a.screenshot({ path: testInfo.outputPath('sapo-personalizado-na-praca.png'), animations: 'disabled' });
  await a.reload();
  await a.getByRole('tab', { name: 'Roupas' }).click();
  await expect(a.getByRole('button', { name: 'Roupas: Capa' })).toHaveAttribute('aria-pressed', 'true');
  await a.getByRole('tab', { name: 'Óculos' }).click();
  await expect(a.getByRole('button', { name: 'Óculos: Coração' })).toHaveAttribute('aria-pressed', 'true');
  await a.getByRole('tab', { name: 'Chapéus' }).click();
  await expect(a.getByRole('button', { name: 'Chapéus: Coroa' })).toHaveAttribute('aria-pressed', 'true');
  await expect(a.locator('#frog-preview')).toHaveAttribute('src', secondLook!);
  await expect(b.locator('#people-count')).toHaveText('1');
  await a.getByRole('button', { name: 'Entrar no brejo' }).click();
  await expect(a.locator('#entry')).toBeHidden();
  await expect(otherAvatar).toHaveAttribute('src', secondLook!);
  await contextA.close(); await contextB.close();
});
