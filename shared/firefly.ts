export const FIREFLY = {
  x: 390, y: 570, interaction: { x: 390, y: 625 },
  enterRadius: 70, exitRadius: 115,
  duration: 60_000, targetDuration: 1_500, attemptDuration: 250,
} as const;

export type FireflyState = {
  id: string; sequence: number; target: number; score: number;
  remainingMs: number; targetRemainingMs: number; status: 'playing' | 'timeout';
};
export type FireflyHit = { id: string; sequence: number; cell: number };
