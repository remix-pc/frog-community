import { describe, expect, it } from 'vitest';
import { findPath, isWalkable, POND, segmentWalkable, SPAWN } from '../shared/world';
import { COLORS, parseMessage, parseProfile } from '../shared/protocol';

describe('caminhos da praça', () => {
  it('usa caminho direto em uma área livre', () => { expect(findPath(SPAWN, { x: 600, y: 490 })).toEqual([{ x: 600, y: 490 }]); });
  it('contorna o lago e mantém todos os segmentos caminháveis', () => {
    const from = { x: 850, y: 110 }, to = { x: 1000, y: 560 };
    expect(segmentWalkable(from, to)).toBe(false);
    const path = findPath(from, to); expect(path).not.toBeNull(); expect(path!.length).toBeGreaterThan(1);
    let previous = from;
    for (const point of path!) { expect(segmentWalkable(previous, point)).toBe(true); previous = point; }
    expect(path!.at(-1)).toEqual(to);
  });
  it('contorna bancos e árvores', () => {
    for (const [from, to] of [[{ x: 240, y: 300 }, { x: 400, y: 300 }], [{ x: 45, y: 545 }, { x: 155, y: 545 }]]) {
      const path = findPath(from, to); expect(path).not.toBeNull(); let previous = from;
      for (const point of path!) { expect(segmentWalkable(previous, point)).toBe(true); previous = point; }
    }
  });
  it('rejeita água, pedras, bordas e coordenadas não finitas', () => {
    for (const point of [POND, { x: 731, y: 192 }, { x: -1, y: 200 }, { x: Infinity, y: 200 }, { x: NaN, y: 0 }]) { expect(isWalkable(point)).toBe(false); expect(findPath(SPAWN, point)).toBeNull(); }
  });
});
describe('validação de conteúdo', () => {
  it('normaliza nomes e aceita português', () => { expect(parseProfile({ nickname: '  Sapão  ', color: COLORS[0].hex })?.nickname).toBe('Sapão'); });
  it('recusa apelidos e cores inválidos', () => {
    for (const nickname of ['a', 'a'.repeat(21), '<svg>', 'sa\npo']) expect(parseProfile({ nickname, color: COLORS[0].hex })).toBeNull();
    expect(parseProfile({ nickname: 'Sapo', color: '#000000' })).toBeNull(); expect(parseProfile(null)).toBeNull();
  });
  it('limita mensagens sem interpretar HTML', () => {
    expect(parseMessage('  Olá!  ')).toBe('Olá!'); expect(parseMessage('a'.repeat(200))).toHaveLength(200);
    expect(parseMessage('a'.repeat(201))).toBeNull(); expect(parseMessage('  ')).toBeNull(); expect(parseMessage({})).toBeNull();
    expect(parseMessage('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });
});
