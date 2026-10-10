import { randomInt, randomUUID } from 'node:crypto';
import { FIREFLY, type FireflyHit, type FireflyState } from '../shared/firefly.js';

export class FireflyRound {
  readonly id = randomUUID();
  readonly startedAt: number;
  sequence = 0;
  score = 0;
  status: FireflyState['status'] = 'playing';
  target: number;
  private targetAt: number;
  private lastAttempt = -Infinity;

  constructor(private now = () => performance.now(), private next = () => randomInt(9)) {
    this.startedAt = now();
    this.targetAt = this.startedAt;
    this.target = next();
  }
  private moveTarget() {
    const previous = this.target;
    let next = this.next();
    if (next === previous) next = (next + 1) % 9;
    this.target = next;
    this.targetAt = this.now();
    this.sequence++;
  }
  advance(): boolean {
    if (this.status !== 'playing') return false;
    const now = this.now();
    if (now - this.startedAt >= FIREFLY.duration) { this.status = 'timeout'; return true; }
    if (now - this.targetAt >= FIREFLY.targetDuration) { this.moveTarget(); return true; }
    return false;
  }
  hit(input: FireflyHit): boolean {
    this.advance();
    if (this.status !== 'playing' || !input || input.id !== this.id || input.sequence !== this.sequence ||
      !Number.isInteger(input.cell) || input.cell < 0 || input.cell > 8 || this.now() - this.lastAttempt < FIREFLY.attemptDuration) return false;
    this.lastAttempt = this.now();
    if (input.cell === this.target) this.score += 10;
    this.moveTarget();
    return true;
  }
  snapshot(): FireflyState {
    this.advance();
    return { id: this.id, sequence: this.sequence, target: this.target, score: this.score,
      remainingMs: Math.max(0, FIREFLY.duration - (this.now() - this.startedAt)),
      targetRemainingMs: Math.max(0, FIREFLY.targetDuration - (this.now() - this.targetAt)), status: this.status };
  }
}
