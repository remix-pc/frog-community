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
export const arcadeDistance = (p: Point) => Math.hypot(p.x - ARCADE.interaction.x, p.y - ARCADE.interaction.y);

// Hysteresis prevents a dismissed invitation from reopening at the boundary.
export class ArcadeProximity {
  private armed = true;
  reset() { this.armed = true; }
  update(point: Point): 'open' | 'close' | undefined {
    const distance = arcadeDistance(point);
    if (distance > ARCADE.exitRadius) this.armed = true;
    if (distance > ARCADE.enterRadius) return 'close';
    if (this.armed) { this.armed = false; return 'open'; }
  }
}
