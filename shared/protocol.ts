import type { ArcadeJump, ArcadeRanking, ArcadeState } from './arcade.js';
import type { FireflyHit, FireflyState } from './firefly.js';
export const COLORS = [
  { name: 'Folha', hex: '#80b85c' }, { name: 'Menta', hex: '#65b79b' },
  { name: 'Lago', hex: '#66b6cd' }, { name: 'Lavanda', hex: '#aa91c9' },
  { name: 'Pitanga', hex: '#d9898b' }, { name: 'Pêssego', hex: '#e5a265' },
  { name: 'Sol', hex: '#d7bf58' }, { name: 'Musgo', hex: '#678b5c' }
] as const;
export const OUTFITS = [
  { id: null, name: 'Nenhuma' }, { id: 'tshirt', name: 'Camiseta' },
  { id: 'hoodie', name: 'Moletom' }, { id: 'jacket', name: 'Jaqueta' },
  { id: 'cape', name: 'Capa' }
] as const;
export const GLASSES = [
  { id: null, name: 'Nenhum' }, { id: 'round', name: 'Redondos' },
  { id: 'sunglasses', name: 'Escuros' }, { id: 'square', name: 'Quadrados' },
  { id: 'heart', name: 'Coração' }
] as const;
export const HATS = [
  { id: null, name: 'Nenhum' }, { id: 'cap', name: 'Boné' },
  { id: 'bucket', name: 'Pescador' }, { id: 'tophat', name: 'Cartola' },
  { id: 'crown', name: 'Coroa' }
] as const;
export type Appearance = {
  outfit: (typeof OUTFITS)[number]['id'];
  glasses: (typeof GLASSES)[number]['id'];
  hat: (typeof HATS)[number]['id'];
};
export const DEFAULT_APPEARANCE: Appearance = { outfit: null, glasses: null, hat: null };
export type Point = { x: number; y: number };
export type MapId = 'plaza' | 'cinema';
export type Profile = { nickname: string; color: string; appearance: Appearance };
export type Player = Profile & Point & { id: string; moving: boolean; facing: number; mapId: MapId; seatId: string | null };
export type ChatMessage = { id: string; playerId: string; nickname: string; color: string; appearance: Appearance; text: string; sentAt: number; mapId: MapId };
export type WorldState = { mapId: MapId; players: Player[]; messages: ChatMessage[] };
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export interface ClientEvents {
  'firefly:start': (reply: (result: Reply<FireflyState>) => void) => void;
  'firefly:hit': (hit: FireflyHit, reply: (result: Reply<FireflyState>) => void) => void;
  'firefly:leave': () => void;
  'arcade:start': (reply: (result: Reply<ArcadeState>) => void) => void;
  'arcade:jump': (jump: ArcadeJump, reply: (result: Reply<ArcadeState>) => void) => void;
  'arcade:leave': () => void;
  'arcade:ranking': (reply: (result: Reply<ArcadeRanking>) => void) => void;
  'player:join': (profile: Profile, reply: (result: Reply<{ selfId: string; state: WorldState }>) => void) => void;
  'player:appearance': (appearance: Appearance, reply: (result: Reply<Appearance>) => void) => void;
  'player:move': (destination: Point) => void;
  'player:sit': (seatId: string, reply: (result: Reply) => void) => void;
  'chat:send': (text: string, reply: (result: Reply) => void) => void;
  'player:leave': () => void;
}
export interface ServerEvents {
  'world:state': (state: WorldState) => void;
  'firefly:state': (state: FireflyState) => void;
  'arcade:state': (state: ArcadeState) => void;
  'arcade:ranking': (ranking: ArcadeRanking) => void;
  'world:positions': (players: Player[]) => void;
  'player:joined': (player: Player) => void;
  'player:appearance': (id: string, appearance: Appearance) => void;
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
  const appearance = 'appearance' in value ? parseAppearance(value.appearance) : { ...DEFAULT_APPEARANCE };
  if (!appearance) return null;
  return { nickname: name, color, appearance };
}
export function parseAppearance(value: unknown): Appearance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { outfit, glasses, hat } = value as Record<string, unknown>;
  if (!OUTFITS.some(option => option.id === outfit)) return null;
  if (!GLASSES.some(option => option.id === glasses)) return null;
  if (!HATS.some(option => option.id === hat)) return null;
  return { outfit: outfit as Appearance['outfit'], glasses: glasses as Appearance['glasses'], hat: hat as Appearance['hat'] };
}
export function parseMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= 200 && !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text) ? text : null;
}
