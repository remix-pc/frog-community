import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createGameServer } from '../server/game';
import { COLORS, DEFAULT_APPEARANCE, parseAppearance, parseProfile, type Appearance, type ClientEvents, type ServerEvents, type Profile, type Reply, type WorldState } from '../shared/protocol';
import { isWalkable } from '../shared/world';
type Client = Socket<ServerEvents, ClientEvents>;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
describe('servidor com clientes Socket.IO reais', () => {
  let server: ReturnType<typeof createGameServer>, url: string;
  const clients: Client[] = [];
  beforeEach(async () => { server = createGameServer(); url = `http://127.0.0.1:${await server.listen(0, '127.0.0.1')}`; });
  afterEach(async () => { clients.forEach(c => c.disconnect()); clients.length = 0; await server.close(); });
  async function connect() {
    const client: Client = io(url, { transports: ['websocket'], forceNew: true }); clients.push(client);
    await new Promise<void>((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); }); return client;
  }
  const join = (c: Client, nickname: string, color: string = COLORS[0].hex, appearance: Appearance = DEFAULT_APPEARANCE) => new Promise<Reply<{ selfId: string; state: WorldState }>>(resolve => c.emit('player:join', { nickname, color, appearance }, resolve));
  const send = (c: Client, text: string) => new Promise<Reply>(resolve => c.emit('chat:send', text, resolve));
  const changeAppearance = (c: Client, appearance: Appearance) => new Promise<Reply<Appearance>>(resolve => c.emit('player:appearance', appearance, resolve));
  it('valida o catálogo e carrega perfis antigos sem acessórios', () => {
    expect(parseProfile({ nickname: 'Sapão', color: COLORS[0].hex })?.appearance).toEqual(DEFAULT_APPEARANCE);
    expect(parseProfile({ nickname: 'Sapão', color: COLORS[0].hex, appearance: { outfit: 'unknown', glasses: null, hat: null } })).toBeNull();
    expect(parseAppearance({ outfit: 'cape', glasses: 'heart', hat: 'crown' })).toEqual({ outfit: 'cape', glasses: 'heart', hat: 'crown' });
    expect(parseAppearance({ outfit: null, glasses: null })).toBeNull();
  });
  it('sincroniza o visual e preserva o visual histórico das mensagens', async () => {
    const a = await connect(), b = await connect();
    const firstLook: Appearance = { outfit: 'tshirt', glasses: 'round', hat: 'cap' };
    const secondLook: Appearance = { outfit: 'cape', glasses: 'heart', hat: 'crown' };
    const first = await join(a, 'Sapão', COLORS[0].hex, firstLook);
    expect(first.ok && first.data.state.players[0].appearance).toEqual(firstLook);
    const second = await join(b, 'Lili');
    expect(second.ok && second.data.state.players.find(p => p.id === a.id)?.appearance).toEqual(firstLook);
    const historical = new Promise<Appearance>(resolve => b.once('chat:message', message => resolve(message.appearance)));
    await send(a, 'Meu primeiro visual'); expect(await historical).toEqual(firstLook);
    const changed = new Promise<Appearance>(resolve => b.once('player:appearance', (id, look) => { expect(id).toBe(a.id); resolve(look); }));
    expect(await changeAppearance(a, secondLook)).toEqual({ ok: true, data: secondLook });
    expect(await changed).toEqual(secondLook);
    expect((await changeAppearance(a, { ...secondLook, hat: 'invalid' } as never)).ok).toBe(false);
    const newcomer = await connect(); const snapshot = await join(newcomer, 'Novo');
    if (snapshot.ok) {
      expect(snapshot.data.state.players.find(p => p.id === a.id)?.appearance).toEqual(secondLook);
      expect(snapshot.data.state.messages[0].appearance).toEqual(firstLook);
    }
    expect((await changeAppearance(newcomer, DEFAULT_APPEARANCE)).ok).toBe(true);
  });
  it('sincroniza entrada, movimento autoritativo e chat entre dois clientes', async () => {
    const a = await connect(), b = await connect();
    const first = await join(a, 'Sapão'); expect(first.ok).toBe(true);
    const entered = new Promise<void>(resolve => a.once('player:joined', p => { expect(p.nickname).toBe('Lili'); resolve(); }));
    const second = await join(b, 'Lili', COLORS[2].hex); expect(second.ok && second.data.state.players.length).toBe(2); await entered;
    const positions: { x: number; y: number }[] = [];
    b.on('world:positions', ps => { const p = ps.find(p => p.id === a.id); if (p) positions.push(p); });
    a.emit('player:move', { x: 620, y: 490 }); await delay(1250);
    expect(positions.length).toBeGreaterThan(8); expect(positions.at(-1)?.x).toBeCloseTo(620, 0);
    expect(positions.every(isWalkable)).toBe(true);
    for (let i = 1; i < positions.length; i++) expect(Math.hypot(positions[i].x - positions[i - 1].x, positions[i].y - positions[i - 1].y)).toBeLessThan(30);
    const received = new Promise<void>(resolve => b.once('chat:message', m => { expect(m.text).toBe('Olá, brejo!'); expect(m.nickname).toBe('Sapão'); expect(m.playerId).toBe(a.id); resolve(); }));
    expect((await send(a, 'Olá, brejo!')).ok).toBe(true); await received;
  });
  it('valida entrada, unicidade, spam e tamanho', async () => {
    const a = await connect(), b = await connect();
    expect((await join(a, 'Sapão')).ok).toBe(true); expect((await join(b, 'sapão')).ok).toBe(false);
    expect((await join(b, '<img>')).ok).toBe(false); expect((await join(b, 'Valid', '#000')).ok).toBe(false);
    expect((await send(b, 'Sem entrar')).ok).toBe(false);
    expect((await send(a, '')).ok).toBe(false); expect((await send(a, 'a'.repeat(201))).ok).toBe(false);
    expect((await send(a, 'Olá')).ok).toBe(true); expect((await send(a, 'Spam')).ok).toBe(false);
    await delay(1020); expect((await send(a, 'Agora sim')).ok).toBe(true);
  });
  it('remove ao desconectar e permite reentrada com snapshot sem duplicação', async () => {
    const a = await connect(), b = await connect(); await join(a, 'Sapo'); await join(b, 'Rãzinha'); await send(a, 'Até já');
    const oldId = a.id; const left = new Promise<string>(resolve => b.once('player:left', resolve)); a.disconnect(); expect(await left).toBe(oldId);
    const reconnected = new Promise<void>(resolve => a.once('connect', resolve)); a.connect(); await reconnected;
    const response = await join(a, 'Sapo'); expect(response.ok).toBe(true);
    if (response.ok) { expect(response.data.state.players).toHaveLength(2); expect(response.data.state.players.some(p => p.id === oldId)).toBe(false); expect(response.data.state.messages.at(-1)?.text).toBe('Até já'); }
    expect((await join(a, 'Outro')).ok).toBe(false);
  });
  it('ignora payloads malformados e substitui o destino', async () => {
    const a = await connect(); await join(a, 'Sapo');
    a.emit('player:move', { x: NaN, y: 10 }); a.emit('player:move', null as never); a.emit('player:join', null as unknown as Profile, () => {});
    await delay(100); a.emit('player:move', { x: 620, y: 490 }); await delay(210); a.emit('player:move', { x: 450, y: 490 }); await delay(850);
    const p = await new Promise<{ x: number; y: number }>(resolve => a.once('world:positions', ps => resolve(ps[0]))); expect(p.x).toBeCloseTo(450, 0); expect(p.y).toBeCloseTo(490, 0);
  });
  it('entrega no máximo as últimas 50 mensagens ao entrar', async () => {
    // Many independent senders avoid altering the real rate-limit clock.
    const senders = await Promise.all(Array.from({ length: 18 }, () => connect()));
    await Promise.all(senders.map((c, i) => join(c, `Sapo ${i}`)));
    for (let round = 0; round < 3; round++) { if (round) await delay(1050); await Promise.all(senders.map((c, i) => send(c, `Rodada ${round} sapo ${i}`))); }
    const newcomer = await connect(); const reply = await join(newcomer, 'Novato');
    expect(reply.ok && reply.data.state.messages.length).toBe(50);
    const finalClient = await connect(); expect((await join(finalClient, 'Último')).ok).toBe(true);
    const extra = await connect(); expect((await join(extra, 'Lotado')).ok).toBe(false);
  });
});
