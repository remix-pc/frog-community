import { describe, expect, it } from 'vitest';
import { ArcadeProximity } from '../shared/arcade';
import { FIREFLY } from '../shared/firefly';
import { findPath, isWalkable, LAMPS, segmentWalkable, SPAWN } from '../shared/world';
import { FireflyRound } from '../server/firefly';
import { isNightInSaoPaulo } from '../client/time';

describe('Pega-Vagalumes', () => {
  it('mantém o gabinete e as luminárias fora dos caminhos, com acesso pela frente', () => {
    expect(isWalkable(FIREFLY)).toBe(false);
    expect(isWalkable(FIREFLY.interaction)).toBe(true);
    for (const lamp of LAMPS) expect(isWalkable(lamp)).toBe(false);
    const path = findPath(SPAWN, FIREFLY.interaction);
    expect(path).not.toBeNull();
    let previous = SPAWN;
    for (const point of path!) { expect(segmentWalkable(previous, point)).toBe(true); previous = point; }
  });
  it('convida uma vez e rearma após o sapo se afastar', () => {
    const proximity = new ArcadeProximity(FIREFLY);
    expect(proximity.update(FIREFLY.interaction)).toBe('open');
    expect(proximity.update(FIREFLY.interaction)).toBeUndefined();
    expect(proximity.update({ x: 390, y: 750 })).toBe('close');
    expect(proximity.update(FIREFLY.interaction)).toBe('open');
  });
  it('valida alvo, sequência, ritmo, erros e expiração', () => {
    let now = 0;
    const round = new FireflyRound(() => now, () => 2);
    expect(round.snapshot()).toMatchObject({ target: 2, score: 0, status: 'playing' });
    const hit = { id: round.id, sequence: 0, cell: 2 };
    expect(round.hit(null as never)).toBe(false);
    expect(round.hit({ ...hit, cell: 9 })).toBe(false);
    expect(round.hit({ ...hit, id: 'other' })).toBe(false);
    expect(round.hit(hit)).toBe(true);
    expect(round.snapshot()).toMatchObject({ target: 3, sequence: 1, score: 10 });
    expect(round.hit(hit)).toBe(false);
    now = 249;
    expect(round.hit({ ...hit, sequence: 1, cell: 3 })).toBe(false);
    now = 250;
    expect(round.hit({ ...hit, sequence: 1, cell: 0 })).toBe(true);
    expect(round.score).toBe(10);
    now = 1_750;
    expect(round.advance()).toBe(true);
    expect(round.snapshot().sequence).toBe(3);
    expect(round.hit({ ...hit, sequence: 2, cell: 2 })).toBe(false);
    now = FIREFLY.duration;
    expect(round.advance()).toBe(true);
    expect(round.snapshot()).toMatchObject({ status: 'timeout', remainingMs: 0, score: 10 });
    expect(round.hit({ ...hit, sequence: 3, cell: 2 })).toBe(false);
  });
});

describe('horário da praça em São Paulo', () => {
  it('troca exatamente às 06h e 18h, sem usar o fuso do navegador', () => {
    expect(isNightInSaoPaulo(new Date('2026-10-09T08:59:59Z'))).toBe(true);
    expect(isNightInSaoPaulo(new Date('2026-10-09T09:00:00Z'))).toBe(false);
    expect(isNightInSaoPaulo(new Date('2026-10-09T20:59:59Z'))).toBe(false);
    expect(isNightInSaoPaulo(new Date('2026-10-09T21:00:00Z'))).toBe(true);
  });
});
