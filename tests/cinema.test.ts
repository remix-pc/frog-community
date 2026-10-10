import { describe, expect, it } from 'vitest';
import { atPortal, CINEMA_SCREEN, CINEMA_SEATS, PORTALS } from '../shared/cinema';
import { findPath, isWalkable, segmentWalkable, SPAWN } from '../shared/world';

describe('caminhos e passagens do cinema', () => {
  it('conecta a praça ao cinema e mantém as chegadas fora das passagens', () => {
    expect(findPath(SPAWN, PORTALS.plaza.point)).not.toBeNull();
    expect(findPath(PORTALS.cinema.arrival, SPAWN)).not.toBeNull();
    for (const mapId of ['plaza', 'cinema'] as const) {
      const portal = PORTALS[mapId];
      expect(atPortal(portal.point, mapId)).toBe(true);
      expect(atPortal(portal.arrival, portal.destination)).toBe(false);
      expect(isWalkable(portal.arrival, portal.destination)).toBe(true);
    }
  });
  it('alcança todas as 24 cadeiras e volta à saída sem atravessar obstáculos', () => {
    expect(new Set(CINEMA_SEATS.map(s => s.id)).size).toBe(24);
    for (const seat of CINEMA_SEATS) {
      expect(isWalkable(seat, 'cinema')).toBe(false);
      for (const [from, to] of [[PORTALS.plaza.arrival, seat.access], [seat.access, PORTALS.cinema.point]]) {
        const path = findPath(from, to, 'cinema');
        expect(path, seat.id).not.toBeNull();
        let previous = from;
        for (const point of path!) {
          expect(segmentWalkable(previous, point, 'cinema'), seat.id).toBe(true);
          previous = point;
        }
        expect(path!.at(-1)).toEqual(to);
      }
    }
  });
  it('bloqueia telão, cadeiras, limites e coordenadas inválidas', () => {
    for (const point of [CINEMA_SCREEN, { x: 720, y: 150 }, { x: -1, y: 500 }, { x: NaN, y: 500 }, { x: Infinity, y: 500 }]) {
      expect(isWalkable(point, 'cinema')).toBe(false);
      expect(findPath(PORTALS.plaza.arrival, point, 'cinema')).toBeNull();
    }
    expect(segmentWalkable({ x: 450, y: 310 }, { x: 450, y: 400 }, 'cinema')).toBe(false);
  });
});
