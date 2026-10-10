import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createGameServer } from '../server/game';
import { COLORS, DEFAULT_APPEARANCE, type ClientEvents, type Reply, type ServerEvents } from '../shared/protocol';
import { ARCADE, type ArcadeRanking, type ArcadeState } from '../shared/arcade';

describe('fliperama com clientes reais', () => {
  let server: ReturnType<typeof createGameServer>, url: string, now: number;
  const clients: Socket<ServerEvents, ClientEvents>[] = [];
  beforeEach(async () => { now = 0; server = createGameServer({ arcadeNow: () => now }); url = `http://127.0.0.1:${await server.listen(0, '127.0.0.1')}`; });
  afterEach(async () => { clients.splice(0).forEach(c => c.disconnect()); await server.close(); });
  async function connect(nickname: string) {
    const client: Socket<ServerEvents, ClientEvents> = io(url, { transports: ['websocket'], forceNew: true }); clients.push(client);
    await new Promise<void>(resolve => client.once('connect', resolve));
    await new Promise<void>(resolve => client.emit('player:join', { nickname, color: COLORS[0].hex, appearance: DEFAULT_APPEARANCE }, reply => { expect(reply.ok).toBe(true); resolve(); }));
    return client;
  }
  async function approach(c: typeof clients[number]) {
    const arrived = new Promise<void>(resolve => {
      const listener: ServerEvents['world:positions'] = players => {
        const player = players.find(p => p.id === c.id);
        if (player && Math.hypot(player.x - 650, player.y - 410) < 1) { c.off('world:positions', listener); resolve(); }
      };
      c.on('world:positions', listener);
    });
    c.emit('player:move', { x: 650, y: 410 }); await arrived;
  }
  const start = (c: typeof clients[number]) => new Promise<Reply<ArcadeState>>(resolve => c.emit('arcade:start', resolve));
  const ranking = (c: typeof clients[number]) => new Promise<Reply<ArcadeRanking>>(resolve => c.emit('arcade:ranking', resolve));
  async function jump(c: typeof clients[number], state: ArcadeState, correct = true) {
    const direction = correct ? state.platforms[0] : state.platforms[0] === 'left' ? 'right' : 'left';
    return new Promise<Reply<ArcadeState>>(resolve => c.emit('arcade:jump', { id: state.id, sequence: state.sequence, direction }, resolve));
  }
  it('valida proximidade, bloqueia movimento, aceita partidas paralelas e compartilha recordes', async () => {
    const a = await connect('Sapão'), b = await connect('Lili');
    expect((await start(a)).ok).toBe(false);
    await Promise.all([approach(a), approach(b)]);
    const first = await start(a), second = await start(b);
    expect(first.ok && second.ok).toBe(true); if (!first.ok || !second.ok) return;
    expect((await start(a)).ok).toBe(false);
    a.emit('player:move', { x: 550, y: 490 });
    const position = await new Promise<{ x: number; y: number }>(resolve => a.once('world:positions', p => resolve(p.find(x => x.id === a.id)!)));
    expect(position).toMatchObject({ x: 650, y: 410 });
    const success = await jump(a, first.data); expect(success.ok).toBe(true); if (!success.ok) return;
    expect(success.data.score).toBe(10);
    expect((await jump(a, first.data)).ok).toBe(false);
    now += 250;
    const broadcast = new Promise<ArcadeRanking>(resolve => b.once('arcade:ranking', resolve));
    const failed = await jump(a, success.data, false); expect(failed.ok && failed.data.status).toBe('fell');
    expect((await broadcast).entries).toEqual([expect.objectContaining({ nickname: 'Sapão', score: 10 })]);
    expect((await ranking(a))).toMatchObject({ ok: true, data: { personalBest: 10 } });
    const timeout = new Promise<ArcadeState>(resolve => b.once('arcade:state', resolve));
    now = ARCADE.duration;
    expect((await timeout).status).toBe('timeout');
    expect((await jump(a, success.data)).ok).toBe(false);
  });
  it('abandona e desconecta sem registrar pontos, liberando uma nova partida', async () => {
    const a = await connect('Sapo'); await approach(a);
    let response = await start(a); expect(response.ok).toBe(true); if (!response.ok) return;
    await jump(a, response.data);
    a.emit('arcade:leave');
    expect(await ranking(a)).toMatchObject({ ok: true, data: { entries: [] } });
    response = await start(a); expect(response.ok).toBe(true); if (!response.ok) return;
    await jump(a, response.data);
    const removed = new Promise<void>(resolve => server.io.sockets.sockets.get(a.id!)!.once('disconnect', () => resolve()));
    a.disconnect(); await removed;
    const b = await connect('Sapo');
    expect(await ranking(b)).toMatchObject({ ok: true, data: { entries: [], personalBest: 0 } });
    expect((await start(b)).ok).toBe(false);
  });
});
