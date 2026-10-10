import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createGameServer } from '../server/game';
import { COLORS, DEFAULT_APPEARANCE, type ClientEvents, type ServerEvents, type WorldState, type Reply, type Player, type MapId, type ChatMessage } from '../shared/protocol';
import { CINEMA_SEATS, PORTALS } from '../shared/cinema';
import { ARCADE } from '../shared/arcade';
import { FIREFLY } from '../shared/firefly';

type Client = Socket<ServerEvents, ClientEvents>;
describe('cinema multiplayer', () => {
  let server: ReturnType<typeof createGameServer>, url: string;
  const clients: Client[] = [], states = new Map<Client, WorldState>();
  beforeEach(async () => { server = createGameServer(); url = `http://127.0.0.1:${await server.listen(0, '127.0.0.1')}`; });
  afterEach(async () => { clients.forEach(c => c.disconnect()); clients.length = 0; states.clear(); await server.close(); });
  async function connect(nickname: string) {
    const client: Client = io(url, { transports: ['websocket'], forceNew: true }); clients.push(client);
    await new Promise<void>(resolve => client.once('connect', resolve));
    client.on('world:state', state => states.set(client, state));
    client.on('world:positions', players => { const state = states.get(client); if (state) states.set(client, { ...state, players }); });
    const result = await new Promise<Reply<{ selfId: string; state: WorldState }>>(resolve => client.emit('player:join', { nickname, color: COLORS[0].hex, appearance: DEFAULT_APPEARANCE }, resolve));
    if (!result.ok) throw new Error(result.error);
    states.set(client, result.data.state);
    return client;
  }
  const self = (client: Client): Player | undefined => states.get(client)?.players.find(p => p.id === client.id);
  const sit = (client: Client, seatId: string) => new Promise<Reply>(resolve => client.emit('player:sit', seatId, resolve));
  const send = (client: Client, text: string) => new Promise<Reply>(resolve => client.emit('chat:send', text, resolve));
  async function travel(client: Client, destination: MapId) {
    // Respect the same input rate limit as normal movement clicks.
    await new Promise(resolve => setTimeout(resolve, 100));
    client.emit('player:move', PORTALS[destination === 'cinema' ? 'plaza' : 'cinema'].point);
    await expect.poll(() => states.get(client)?.mapId, { timeout: 8000 }).toBe(destination);
  }

  it('isola posições, participantes, aparência e histórico; permite ida e volta', async () => {
    const a = await connect('Cinema A'), b = await connect('Praca B');
    const received: ChatMessage[] = []; b.on('chat:message', m => received.push(m));
    let appearanceEvents = 0; b.on('player:appearance', () => appearanceEvents++);
    let left = ''; b.on('player:left', id => { left = id; });
    expect((await send(a, 'Mensagem da praça')).ok).toBe(true);
    await travel(a, 'cinema');
    expect(left).toBe(a.id);
    expect(states.get(a)?.messages).toEqual([]);
    expect(states.get(a)?.players.map(p => p.id)).toEqual([a.id]);
    await expect.poll(() => states.get(b)?.players.map(p => p.id)).toEqual([b.id]);
    expect((await send(a, 'Mensagem do cinema')).ok).toBe(true);
    await new Promise<void>(resolve => a.emit('player:appearance', { outfit: 'cape', glasses: 'round', hat: 'crown' }, () => resolve()));
    await travel(b, 'cinema');
    expect(received.map(m => m.text)).toEqual(['Mensagem da praça']);
    expect(appearanceEvents).toBe(0);
    expect(states.get(b)?.messages.map(m => m.text)).toEqual(['Mensagem do cinema']);
    expect(states.get(b)?.players.find(p => p.id === a.id)?.appearance.hat).toBe('crown');
    await travel(a, 'plaza');
    expect(states.get(a)?.messages.map(m => m.text)).toEqual(['Mensagem da praça']);
    expect(self(a)?.seatId).toBeNull();
    expect(self(a)?.y).toBe(PORTALS.cinema.arrival.y);
    await expect.poll(() => states.get(b)?.players.length).toBe(1);
  }, 30000);

  it('reserva, cancela, senta e libera cadeiras sem dupla ocupação', async () => {
    const a = await connect('Sapo A'), b = await connect('Sapo B');
    expect((await sit(a, 'seat-1')).ok).toBe(false);
    await Promise.all([travel(a, 'cinema'), travel(b, 'cinema')]);
    expect((await sit(a, 'inexistente')).ok).toBe(false);
    expect((await sit(a, null as never)).ok).toBe(false);
    const seat = CINEMA_SEATS[23];
    expect((await sit(a, seat.id)).ok).toBe(true);
    expect((await sit(b, seat.id)).ok).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    a.emit('player:move', { x: 720, y: 695 });
    await expect.poll(async () => (await sit(b, seat.id)).ok).toBe(true);
    await expect.poll(() => self(b)?.seatId, { timeout: 6000 }).toBe(seat.id);
    expect(self(b)?.moving).toBe(false);
    expect(self(b)?.x).toBe(seat.access.x);
    expect((await sit(a, seat.id)).ok).toBe(false);
    b.emit('player:move', { x: 720, y: 680 });
    await expect.poll(() => self(b)?.seatId).toBeNull();
    expect((await sit(a, seat.id)).ok).toBe(true);
    await expect.poll(() => self(a)?.seatId, { timeout: 6000 }).toBe(seat.id);
    a.disconnect();
    await expect.poll(async () => (await sit(b, seat.id)).ok).toBe(true);
    await expect.poll(() => self(b)?.seatId, { timeout: 6000 }).toBe(seat.id);
    // Disconnecting en route also releases a reservation; rejoining starts in the plaza.
    expect((await sit(b, 'seat-1')).ok).toBe(true);
    b.disconnect();
    const newcomer = await connect('Sapo A');
    expect(self(newcomer)?.mapId).toBe('plaza');
    expect(self(newcomer)?.seatId).toBeNull();
    await travel(newcomer, 'cinema');
    expect((await sit(newcomer, 'seat-1')).ok).toBe(true);
    await travel(newcomer, 'plaza');
    expect(self(newcomer)?.seatId).toBeNull();
  }, 40000);

  it('rejeita fliperamas no cinema mesmo nas coordenadas das máquinas', async () => {
    const client = await connect('Sem fliperama'); await travel(client, 'cinema');
    // The exact arcade coordinate overlaps a cinema chair; this walkable point
    // is still inside the machine's enter radius and must be rejected by map.
    for (const [point, event] of [[{ x: ARCADE.interaction.x + 40, y: ARCADE.interaction.y }, 'arcade:start'], [FIREFLY.interaction, 'firefly:start']] as const) {
      client.emit('player:move', point);
      await expect.poll(() => { const player = self(client); return player && Math.hypot(player.x - point.x, player.y - point.y) < 1; }, { timeout: 8000 }).toBe(true);
      const response = await new Promise<{ ok: boolean }>(resolve => client.emit(event, resolve));
      expect(response.ok).toBe(false);
    }
  }, 25000);
});
