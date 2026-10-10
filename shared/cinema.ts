import type { MapId, Point } from './protocol.js';

export const CINEMA_SEATS = Array.from({ length: 24 }, (_, index) => {
  const row = Math.floor(index / 6), column = index % 6;
  const x = [450, 540, 630, 800, 890, 980][column], y = 350 + row * 85;
  return { id: `seat-${index + 1}`, x, y, access: { x, y: y + 32 } };
});
export const CINEMA_SCREEN = { x: 720, y: 270, width: 690, height: 225 };
export const CINEMA_TREES = [
  { x: 110, y: 200, scale: 1.05 }, { x: 220, y: 170, scale: 0.8 },
  { x: 1130, y: 220, scale: 0.95 }, { x: 1140, y: 510, scale: 1 },
  { x: 150, y: 650, scale: 1.1 }, { x: 1040, y: 745, scale: 0.8 }
];
export const CINEMA_LAMPS = [{ x: 340, y: 340 }, { x: 1080, y: 340 }, { x: 340, y: 640 }, { x: 1080, y: 640 }];
export const PORTALS: Record<MapId, { point: Point; arrival: Point; destination: MapId }> = {
  plaza: { point: { x: 490, y: 105 }, arrival: { x: 720, y: 700 }, destination: 'cinema' },
  cinema: { point: { x: 720, y: 755 }, arrival: { x: 490, y: 160 }, destination: 'plaza' }
};
export const atPortal = (point: Point, mapId: MapId) => Math.hypot(point.x - PORTALS[mapId].point.x, point.y - PORTALS[mapId].point.y) <= 16;
