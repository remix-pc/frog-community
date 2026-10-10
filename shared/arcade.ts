import type { Point } from './protocol.js';

export const ARCADE = {
  x: 650, y: 300, interaction: { x: 650, y: 360 },
  enterRadius: 70, exitRadius: 115, duration: 60_000, jumpDuration: 250,
};
export type Direction = 'left' | 'right';
export type ArcadeState = {
  id: string; sequence: number; platforms: Direction[]; score: number;
  remainingMs: number; status: 'playing' | 'fell' | 'timeout';
};
export type ArcadeJump = { id: string; sequence: number; direction: Direction };
export type ArcadeScore = { nickname: string; score: number; achievedAt: number };
export type ArcadeRanking = { available: boolean; entries: ArcadeScore[]; personalBest: number };
export const nicknameKey = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
export type Cabinet = { interaction: Point; enterRadius: number; exitRadius: number };
export const arcadeDistance = (p: Point, cabinet: Cabinet = ARCADE) => Math.hypot(p.x - cabinet.interaction.x, p.y - cabinet.interaction.y);

// Hysteresis prevents a dismissed invitation from reopening at the boundary.
export class ArcadeProximity {
  private armed = true;
  constructor(private cabinet: Cabinet = ARCADE) {}
  reset() { this.armed = true; }
  update(point: Point): 'open' | 'close' | undefined {
    const distance = arcadeDistance(point, this.cabinet);
    if (distance > this.cabinet.exitRadius) this.armed = true;
    if (distance > this.cabinet.enterRadius) return 'close';
    if (this.armed) { this.armed = false; return 'open'; }
  }
}
