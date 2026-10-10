import type { MapId, Point } from './protocol.js';
import { CINEMA_LAMPS, CINEMA_SCREEN, CINEMA_SEATS, CINEMA_TREES } from './cinema.js';
import { ARCADE } from './arcade.js';
import { FIREFLY } from './firefly.js';
export const WORLD = { width: 1200, height: 800, cell: 20, speed: 135 };
export const SPAWN = { x: 550, y: 490 };
// These footprints are also used to draw the scenery. Positions are frog foot points.
export const POND = { x: 930, y: 310, rx: 218, ry: 160 };
export const TREES = [
  { x: 95, y: 200, scale: 1.1 }, { x: 195, y: 140, scale: 0.95 },
  { x: 340, y: 115, scale: 1.05 }, { x: 610, y: 125, scale: 1 },
  { x: 1120, y: 150, scale: 0.9 }, { x: 100, y: 545, scale: 1.1 },
  { x: 205, y: 695, scale: 1 }, { x: 1090, y: 650, scale: 1.1 },
  { x: 970, y: 755, scale: 0.85 }, { x: 55, y: 760, scale: 0.8 }
];
export const ROCKS = [{ x: 731, y: 192, rx: 35, ry: 24 }, { x: 1130, y: 490, rx: 32, ry: 20 }, { x: 330, y: 638, rx: 25, ry: 18 }];
export const BENCHES = [{ x: 320, y: 300 }, { x: 790, y: 615 }];
export const SIGN = { x: 475, y: 235 };
export const LAMPS = [
  { x: 250, y: 400 }, { x: 550, y: 180 }, { x: 690, y: 440 },
  { x: 840, y: 650 }, { x: 1150, y: 420 }, { x: 500, y: 700 }
];
export const inEllipse = (p: Point, x: number, y: number, rx: number, ry: number) => ((p.x - x) / rx) ** 2 + ((p.y - y) / ry) ** 2 <= 1;
export function isWalkable(p: Point, mapId: MapId = 'plaza'): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 30 || p.y < 100 || p.x > 1170 || p.y > 770) return false;
  if (mapId === 'cinema') {
    if (Math.abs(p.x - CINEMA_SCREEN.x) < CINEMA_SCREEN.width / 2 + 20 && p.y < CINEMA_SCREEN.y + 25) return false;
    if (CINEMA_SEATS.some(s => Math.abs(p.x - s.x) < 35 && Math.abs(p.y - s.y) < 21)) return false;
    if (CINEMA_TREES.some(t => inEllipse(p, t.x, t.y, 36 * t.scale, 25 * t.scale))) return false;
    return !CINEMA_LAMPS.some(l => Math.hypot(p.x - l.x, p.y - l.y) < 13);
  }
  if (Math.abs(p.x - ARCADE.x) < 48 && Math.abs(p.y - ARCADE.y) < 28) return false;
  if (Math.abs(p.x - FIREFLY.x) < 30 && Math.abs(p.y - FIREFLY.y) < 16) return false;
  if (inEllipse(p, POND.x, POND.y, POND.rx + 20, POND.ry + 20)) return false;
  if (TREES.some(t => inEllipse(p, t.x, t.y, 36 * t.scale, 25 * t.scale))) return false;
  if (ROCKS.some(r => inEllipse(p, r.x, r.y, r.rx + 14, r.ry + 14))) return false;
  if (BENCHES.some(b => Math.abs(p.x - b.x) < 70 && Math.abs(p.y - b.y) < 28)) return false;
  if (LAMPS.some(l => Math.hypot(p.x - l.x, p.y - l.y) < 13)) return false;
  return !(Math.abs(p.x - SIGN.x) < 65 && Math.abs(p.y - SIGN.y) < 22);
}
export function segmentWalkable(a: Point, b: Point, mapId: MapId = 'plaza'): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let i = 0; i <= steps; i++) if (!isWalkable({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, mapId)) return false;
  return true;
}
const COLS = WORLD.width / WORLD.cell;
const ROWS = WORLD.height / WORLD.cell;
const center = (i: number): Point => ({ x: (i % COLS) * WORLD.cell + 10, y: Math.floor(i / COLS) * WORLD.cell + 10 });
const grids = Object.fromEntries((['plaza', 'cinema'] as const).map(mapId => [mapId, Array.from({ length: COLS * ROWS }, (_, i) => isWalkable(center(i), mapId))])) as Record<MapId, boolean[]>;
function nearest(p: Point, mapId: MapId): number {
  const walkable = grids[mapId];
  let best = -1, distance = Infinity;
  for (let i = 0; i < walkable.length; i++) {
    if (!walkable[i]) continue;
    const c = center(i), d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < distance && segmentWalkable(p, c, mapId)) { distance = d; best = i; }
  }
  return best;
}
export function findPath(from: Point, to: Point, mapId: MapId = 'plaza'): Point[] | null {
  const walkable = grids[mapId];
  if (!isWalkable(from, mapId) || !isWalkable(to, mapId)) return null;
  if (segmentWalkable(from, to, mapId)) return [to];
  const start = nearest(from, mapId), goal = nearest(to, mapId);
  if (start < 0 || goal < 0) return null;
  const open = new Set([start]), parent = new Map<number, number>(), cost = new Map([[start, 0]]);
  const heuristic = (i: number) => Math.hypot(center(i).x - center(goal).x, center(i).y - center(goal).y);
  while (open.size) {
    let current = -1, best = Infinity;
    for (const i of open) { const f = cost.get(i)! + heuristic(i); if (f < best) { best = f; current = i; } }
    if (current === goal) {
      const path = [to, center(goal)];
      while (parent.has(current)) { current = parent.get(current)!; path.push(center(current)); }
      path.reverse();
      // Keep only waypoints that are needed to avoid scenery.
      const smooth: Point[] = []; let anchor = from, index = 0;
      while (index < path.length) {
        let next = index;
        for (let j = index; j < path.length; j++) { if (!segmentWalkable(anchor, path[j], mapId)) break; next = j; }
        smooth.push(path[next]); anchor = path[next]; index = next + 1;
      }
      return smooth;
    }
    open.delete(current);
    const x = current % COLS, y = Math.floor(current / COLS);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy, n = ny * COLS + nx;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !walkable[n] || !segmentWalkable(center(current), center(n), mapId)) continue;
      const g = cost.get(current)! + Math.hypot(dx, dy) * WORLD.cell;
      if (g < (cost.get(n) ?? Infinity)) { parent.set(n, current); cost.set(n, g); open.add(n); }
    }
  }
  return null;
}
