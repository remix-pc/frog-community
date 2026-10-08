import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ARCADE, nicknameKey, type ArcadeJump, type ArcadeRanking, type ArcadeScore, type ArcadeState, type Direction } from '../shared/arcade.js';

export class ArcadeRound {
  readonly id = randomUUID();
  readonly startedAt: number;
  sequence = 0;
  score = 0;
  status: ArcadeState['status'] = 'playing';
  private lastJump = -Infinity;
  private platforms: Direction[];
  constructor(private now = () => performance.now(), private next: () => Direction = () => randomInt(2) ? 'left' : 'right') {
    this.startedAt = now();
    this.platforms = Array.from({ length: 5 }, next);
  }
  expire() {
    if (this.status === 'playing' && this.now() - this.startedAt >= ARCADE.duration) this.status = 'timeout';
  }
  jump(input: ArcadeJump): boolean {
    this.expire();
    if (this.status !== 'playing' || !input || input.id !== this.id || input.sequence !== this.sequence ||
      !['left', 'right'].includes(input.direction) || this.now() - this.lastJump < ARCADE.jumpDuration) return false;
    this.lastJump = this.now();
    this.sequence++;
    if (input.direction !== this.platforms[0]) this.status = 'fell';
    else { this.score += 10; this.platforms.shift(); this.platforms.push(this.next()); }
    return true;
  }
  snapshot(): ArcadeState {
    this.expire();
    return { id: this.id, sequence: this.sequence, platforms: [...this.platforms], score: this.score,
      remainingMs: Math.max(0, ARCADE.duration - (this.now() - this.startedAt)), status: this.status };
  }
}

export class ArcadeScoreStore {
  private entries = new Map<string, ArcadeScore>();
  private available = true;
  private queue: Promise<void>;
  constructor(private path?: string) { this.queue = this.load(); }
  private async load() {
    if (!this.path) return;
    try {
      const data: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      if (!Array.isArray(data)) throw new Error('Invalid ranking');
      for (const item of data) {
        if (!item || typeof item.nickname !== 'string' || item.nickname.length < 3 || item.nickname.length > 20 ||
          !/^[\p{L}\p{N}_ -]+$/u.test(item.nickname) || !Number.isSafeInteger(item.score) || item.score < 0 ||
          !Number.isSafeInteger(item.achievedAt) || item.achievedAt < 0 || this.entries.has(nicknameKey(item.nickname))) throw new Error('Invalid ranking');
        this.entries.set(nicknameKey(item.nickname), { nickname: item.nickname, score: item.score, achievedAt: item.achievedAt });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { this.available = false; this.entries.clear(); }
    }
  }
  async ranking(nickname: string): Promise<ArcadeRanking> {
    await this.queue;
    return { available: this.available, entries: this.available ? [...this.entries.values()]
      .sort((a, b) => b.score - a.score || a.achievedAt - b.achievedAt || nicknameKey(a.nickname).localeCompare(nicknameKey(b.nickname)))
      .slice(0, 10) : [], personalBest: this.available ? this.entries.get(nicknameKey(nickname))?.score ?? 0 : 0 };
  }
  record(nickname: string, score: number, achievedAt = Date.now()) {
    this.queue = this.queue.then(async () => {
      const key = nicknameKey(nickname), previous = this.entries.get(key);
      if (!this.available || previous && previous.score >= score) return;
      const updated = new Map(this.entries);
      updated.set(key, { nickname, score, achievedAt });
      if (this.path) {
        const temporary = `${this.path}.${randomUUID()}.tmp`;
        try {
          await mkdir(dirname(this.path), { recursive: true });
          await writeFile(temporary, JSON.stringify([...updated.values()], null, 2), 'utf8');
          await rename(temporary, this.path);
        } catch {
          this.available = false;
          await unlink(temporary).catch(() => {});
          return;
        }
      }
      this.entries = updated;
    });
    return this.queue;
  }
  async flush() { await this.queue; }
}
