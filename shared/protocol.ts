import type { ArcadeJump, ArcadeRanking, ArcadeState } from './arcade.js';
export const COLORS = [
  { name: 'Folha', hex: '#80b85c' }, { name: 'Menta', hex: '#65b79b' },
  { name: 'Lago', hex: '#66b6cd' }, { name: 'Lavanda', hex: '#aa91c9' },
  { name: 'Pitanga', hex: '#d9898b' }, { name: 'Pêssego', hex: '#e5a265' },
  { name: 'Sol', hex: '#d7bf58' }, { name: 'Musgo', hex: '#678b5c' }
] as const;
export type Point = { x: number; y: number };
export type Profile = { nickname: string; color: string };
export type Player = Profile & Point & { id: string; moving: boolean; facing: number };
export type ChatMessage = { id: string; playerId: string; nickname: string; color: string; text: string; sentAt: number };
export type WorldState = { players: Player[]; messages: ChatMessage[] };
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export interface ClientEvents {
  'arcade:start': (reply: (result: Reply<ArcadeState>) => void) => void;
  'arcade:jump': (jump: ArcadeJump, reply: (result: Reply<ArcadeState>) => void) => void;
  'arcade:leave': () => void;
  'arcade:ranking': (reply: (result: Reply<ArcadeRanking>) => void) => void;
  'player:join': (profile: Profile, reply: (result: Reply<{ selfId: string; state: WorldState }>) => void) => void;
  'player:move': (destination: Point) => void;
  'chat:send': (text: string, reply: (result: Reply) => void) => void;
  'player:leave': () => void;
}
export interface ServerEvents {
  'arcade:state': (state: ArcadeState) => void;
  'arcade:ranking': (ranking: ArcadeRanking) => void;
  'world:positions': (players: Player[]) => void;
  'player:joined': (player: Player) => void;
  'player:left': (id: string) => void;
  'chat:message': (message: ChatMessage) => void;
  'game:error': (message: string) => void;
}
export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const { nickname, color } = value as Record<string, unknown>;
  if (typeof nickname !== 'string' || typeof color !== 'string') return null;
  const name = nickname.trim().normalize('NFC');
  if (name.length < 3 || name.length > 20 || !/^[\p{L}\p{N}_ -]+$/u.test(name)) return null;
  if (!COLORS.some(c => c.hex === color)) return null;
  return { nickname: name, color };
}
export function parseMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= 200 && !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text) ? text : null;
}
