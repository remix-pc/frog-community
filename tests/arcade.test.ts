import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ARCADE, ArcadeProximity } from '../shared/arcade';
import { ArcadeRound, ArcadeScoreStore } from '../server/arcade';
import { findPath, isWalkable, segmentWalkable } from '../shared/world';

describe('fliperama e proximidade', () => {
  it('convida uma vez e só rearma depois de se afastar', () => {
    const proximity = new ArcadeProximity();
    expect(proximity.update({ x: 650, y: 431 })).toBe('close');
    expect(proximity.update({ x: 650, y: 430 })).toBe('open');
    expect(proximity.update(ARCADE.interaction)).toBeUndefined();
    expect(proximity.update({ x: 650, y: 460 })).toBe('close');
    expect(proximity.update(ARCADE.interaction)).toBeUndefined();
    proximity.update({ x: 650, y: 476 });
    expect(proximity.update(ARCADE.interaction)).toBe('open');
  });
  it('impede atravessar a máquina e mantém sua frente acessível', () => {
    expect(isWalkable(ARCADE)).toBe(false);
    expect(isWalkable(ARCADE.interaction)).toBe(true);
    const from = { x: 585, y: 250 }, to = { x: 650, y: 360 };
    expect(segmentWalkable(from, to)).toBe(false);
    const path = findPath(from, to); expect(path).not.toBeNull();
    let previous = from;
    for (const point of path!) { expect(segmentWalkable(previous, point)).toBe(true); previous = point; }
  });
});

describe('partida autoritativa', () => {
  it('pontua apenas acertos, rejeita repetição, excesso de velocidade e payload inválido', () => {
    let now = 0;
    const round = new ArcadeRound(() => now, () => 'left');
    const jump = { id: round.id, sequence: 0, direction: 'left' as const };
    expect(round.snapshot().platforms).toHaveLength(5);
    expect(round.jump(null as never)).toBe(false);
    expect(round.jump({ ...jump, id: 'outra' })).toBe(false);
    expect(round.jump({ ...jump, direction: 'up' as never })).toBe(false);
    expect(round.jump(jump)).toBe(true);
    expect(round.score).toBe(10);
    now = 249;
    expect(round.jump({ ...jump, sequence: 1 })).toBe(false);
    now = 250;
    expect(round.jump(jump)).toBe(false);
    expect(round.jump({ ...jump, sequence: 1 })).toBe(true);
    expect(round.score).toBe(20);
    now = 500;
    expect(round.jump({ ...jump, sequence: 2, direction: 'right' })).toBe(true);
    expect(round.snapshot().status).toBe('fell');
    expect(round.score).toBe(20);
    now = 750;
    expect(round.jump({ ...jump, sequence: 3 })).toBe(false);
  });
  it('encerra em 60 segundos sem depender do cliente', () => {
    let now = 100;
    const round = new ArcadeRound(() => now, () => 'right');
    now += ARCADE.duration;
    expect(round.jump({ id: round.id, sequence: 0, direction: 'right' })).toBe(false);
    expect(round.snapshot()).toMatchObject({ status: 'timeout', score: 0, remainingMs: 0 });
  });
});

describe('recordes persistentes', () => {
  const folders: string[] = [];
  async function file() { const dir = await mkdtemp(join(tmpdir(), 'frog-arcade-')); folders.push(dir); return join(dir, 'scores.json'); }
  afterEach(async () => { await Promise.all(folders.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
  it('serializa gravações, preserva o maior recorde por nome e reabre após reinício', async () => {
    const path = await file(), store = new ArcadeScoreStore(path);
    await Promise.all([store.record('Sapão', 30, 100), store.record('sapa\u0303o', 20, 110), store.record('Lili', 30, 120)]);
    expect(await store.ranking('SAPÃO')).toMatchObject({ available: true, personalBest: 30, entries: [{ nickname: 'Sapão', score: 30 }, { nickname: 'Lili', score: 30 }] });
    await store.record('sapão', 30, 130);
    expect((await store.ranking('sapão')).entries[0].achievedAt).toBe(100);
    await store.record('SAPÃO', 50, 140);
    const reopened = new ArcadeScoreStore(path);
    expect(await reopened.ranking('sapão')).toMatchObject({ available: true, personalBest: 50, entries: [{ nickname: 'SAPÃO', score: 50 }, { nickname: 'Lili', score: 30 }] });
    expect(JSON.parse(await readFile(path, 'utf8'))).toHaveLength(2);
  });
  it('limita o ranking a dez sem perder o recorde pessoal de quem está fora', async () => {
    const store = new ArcadeScoreStore();
    await Promise.all(Array.from({ length: 12 }, (_, i) => store.record(`Sapo ${i}`, i * 10, i)));
    const ranking = await store.ranking('Sapo 0');
    expect(ranking.entries).toHaveLength(10); expect(ranking.personalBest).toBe(0);
    expect(ranking.entries[0].score).toBe(110);
  });
  it('preserva arquivo ilegível e comunica indisponibilidade', async () => {
    const path = await file(); await writeFile(path, '{inválido');
    const store = new ArcadeScoreStore(path); await store.record('Sapo', 100);
    expect((await store.ranking('Sapo')).available).toBe(false);
    expect(await readFile(path, 'utf8')).toBe('{inválido');
  });
  it('informa falha de gravação sem publicar recorde não salvo', async () => {
    const path = await file();
    const store = new ArcadeScoreStore(join(path, 'scores.json'));
    await store.ranking('Sapo');
    await writeFile(path, 'preservar');
    await store.record('Sapo', 100);
    expect(await store.ranking('Sapo')).toEqual({ available: false, entries: [], personalBest: 0 });
    expect(await readFile(path, 'utf8')).toBe('preservar');
  });
});
