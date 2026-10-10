import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createGameServer } from '../server/game';
import { COLORS, DEFAULT_APPEARANCE, type ClientEvents, type Reply, type ServerEvents } from '../shared/protocol';
import { ARCADE, type ArcadeRanking, type ArcadeState } from '../shared/arcade';
import { FIREFLY, type FireflyState } from '../shared/firefly';

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
  async function approachFirefly(c: typeof clients[number]) {
    const arrived = new Promise<void>(resolve => {
      const listener: ServerEvents['world:positions'] = players => {
        const player = players.find(p => p.id === c.id);
        if (player && Math.hypot(player.x - FIREFLY.interaction.x, player.y - FIREFLY.interaction.y) < 1) { c.off('world:positions', listener); resolve(); }
      };
      c.on('world:positions', listener);
    });
    c.emit('player:move', FIREFLY.interaction); await arrived;
  }
  const start = (c: typeof clients[number]) => new Promise<Reply<ArcadeState>>(resolve => c.emit('arcade:start', resolve));
  const fireflyStart = (c: typeof clients[number]) => new Promise<Reply<FireflyState>>(resolve => c.emit('firefly:start', resolve));
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
  it('usa o mesmo ranking para os dois jogos e impede partidas simultâneas', async () => {
    const a = await connect('Vaga Lume');
    expect((await fireflyStart(a)).ok).toBe(false);
    await approachFirefly(a);
    const started = await fireflyStart(a);
    expect(started.ok).toBe(true); if (!started.ok) return;
    expect(await start(a)).toEqual({ ok: false, error: 'Você já está jogando.' });
    a.emit('player:move', { x: 650, y: 410 });
    const still = await new Promise<{ x: number; y: number }>(resolve => a.once('world:positions', players => resolve(players.find(p => p.id === a.id)!)));
    expect(still).toMatchObject(FIREFLY.interaction);
    const first = await new Promise<Reply<FireflyState>>(resolve => a.emit('firefly:hit', { id: started.data.id, sequence: 0, cell: started.data.target }, resolve));
    expect(first).toMatchObject({ ok: true, data: { score: 10 } });
    if (!first.ok) return;
    now += FIREFLY.attemptDuration;
    const secondHit = await new Promise<Reply<FireflyState>>(resolve => a.emit('firefly:hit', { id: first.data.id, sequence: first.data.sequence, cell: first.data.target }, resolve));
    expect(secondHit).toMatchObject({ ok: true, data: { score: 20 } });
    expect(await ranking(a)).toMatchObject({ ok: true, data: { entries: [] } });
    const finished = new Promise<FireflyState>(resolve => a.once('firefly:state', resolve));
    now = FIREFLY.duration;
    expect((await finished).status).toBe('timeout');
    expect(await ranking(a)).toMatchObject({ ok: true, data: { personalBest: 20, entries: [{ nickname: 'Vaga Lume', score: 20 }] } });
    await approach(a);
    const second = await start(a);
    expect(second.ok).toBe(true); if (!second.ok) return;
    expect(await fireflyStart(a)).toEqual({ ok: false, error: 'Você já está jogando.' });
    now += 250;
    const jumpResult = await jump(a, second.data);
    expect(jumpResult.ok).toBe(true); if (!jumpResult.ok) return;
    now += 250;
    await jump(a, jumpResult.data, false);
    expect(await ranking(a)).toMatchObject({ ok: true, data: { personalBest: 20, entries: [{ nickname: 'Vaga Lume', score: 20 }] } });
  });
});
