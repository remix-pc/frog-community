import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { parseAppearance, parseMessage, parseProfile, type ClientEvents, type ServerEvents, type Player, type Point, type ChatMessage } from '../shared/protocol.js';
import { findPath, SPAWN, WORLD } from '../shared/world.js';
import { ARCADE, arcadeDistance } from '../shared/arcade.js';
import { FIREFLY } from '../shared/firefly.js';
import { ArcadeRound, ArcadeScoreStore } from './arcade.js';
import { FireflyRound } from './firefly.js';

export function createGameServer(options: { scorePath?: string; arcadeNow?: () => number } = {}) {
  const app = express();
  const http = createServer(app);
  const io = new Server<ClientEvents, ServerEvents>(http, { maxHttpBufferSize: 8192 });
  const players = new Map<string, Player>();
  const paths = new Map<string, Point[]>();
  const messages: ChatMessage[] = [];
  const rounds = new Map<string, ArcadeRound>();
  const fireflyRounds = new Map<string, FireflyRound>();
  const scores = new ArcadeScoreStore(options.scorePath);
  const finishRound = (id: string, round: ArcadeRound) => {
    if (rounds.get(id) !== round || round.status === 'playing') return;
    rounds.delete(id);
    io.to(id).emit('arcade:state', round.snapshot());
    const player = players.get(id);
    if (player) void scores.record(player.nickname, round.score).then(async () => {
      for (const current of players.values()) io.to(current.id).emit('arcade:ranking', await scores.ranking(current.nickname));
    });
  };
  const finishFirefly = (id: string, round: FireflyRound) => {
    if (fireflyRounds.get(id) !== round || round.status === 'playing') return;
    fireflyRounds.delete(id);
    io.to(id).emit('firefly:state', round.snapshot());
    const player = players.get(id);
    if (player) void scores.record(player.nickname, round.score).then(async () => {
      for (const current of players.values()) io.to(current.id).emit('arcade:ranking', await scores.ranking(current.nickname));
    });
  };
  app.get('/health', (_req, res) => res.json({ status: 'ok', players: players.size }));
  app.use(express.static(resolve('dist')));
  io.on('connection', socket => {
    let lastMessage = 0, lastMove = 0;
    const leave = () => {
      rounds.delete(socket.id);
      fireflyRounds.delete(socket.id);
      paths.delete(socket.id);
      if (players.delete(socket.id)) io.to('plaza').emit('player:left', socket.id);
      void socket.leave('plaza');
    };
    socket.on('player:join', (input, reply) => {
      if (typeof reply !== 'function') return;
      const profile = parseProfile(input);
      if (!profile) return reply({ ok: false, error: 'Use um apelido de 3 a 20 letras, números, espaços, _ ou - e escolha uma cor.' });
      if (players.has(socket.id)) return reply({ ok: false, error: 'Você já está na praça.' });
      if (players.size >= 20) return reply({ ok: false, error: 'A praça está cheia! Tente novamente em instantes.' });
      if ([...players.values()].some(p => p.nickname.toLocaleLowerCase('pt-BR') === profile.nickname.toLocaleLowerCase('pt-BR'))) return reply({ ok: false, error: 'Esse apelido já está no brejo. Escolha outro.' });
      const index = players.size;
      const player: Player = { ...profile, id: socket.id, x: SPAWN.x + (index % 5) * 28 - 56, y: SPAWN.y + Math.floor(index / 5) * 24, moving: false, facing: 1 };
      players.set(socket.id, player);
      void socket.join('plaza');
      reply({ ok: true, data: { selfId: socket.id, state: { players: [...players.values()], messages: [...messages] } } });
      socket.to('plaza').emit('player:joined', player);
    });
    socket.on('player:appearance', (input, reply) => {
      if (typeof reply !== 'function') return;
      const player = players.get(socket.id);
      if (!player) return reply({ ok: false, error: 'Entre na praça para personalizar seu sapo.' });
      if (rounds.has(socket.id) || fireflyRounds.has(socket.id)) return reply({ ok: false, error: 'Termine a partida antes de personalizar seu sapo.' });
      const appearance = parseAppearance(input);
      if (!appearance) return reply({ ok: false, error: 'Escolha roupas e acessórios disponíveis.' });
      player.appearance = appearance;
      reply({ ok: true, data: appearance });
      io.to('plaza').emit('player:appearance', player.id, appearance);
    });
    socket.on('player:move', destination => {
      const player = players.get(socket.id), now = Date.now();
      if (!player || rounds.has(socket.id) || fireflyRounds.has(socket.id) || now - lastMove < 80) return;
      lastMove = now;
      if (!destination || typeof destination.x !== 'number' || typeof destination.y !== 'number') return;
      const path = findPath(player, destination);
      if (!path) { socket.emit('game:error', 'Escolha um ponto no caminho ou na grama.'); return; }
      paths.set(socket.id, path);
    });
    socket.on('arcade:start', reply => {
      if (typeof reply !== 'function') return;
      const player = players.get(socket.id);
      if (rounds.has(socket.id) || fireflyRounds.has(socket.id)) return reply({ ok: false, error: 'Você já está jogando.' });
      if (!player || arcadeDistance(player) > ARCADE.enterRadius) return reply({ ok: false, error: 'Chegue perto do fliperama para jogar.' });
      paths.delete(socket.id); player.moving = false;
      const round = new ArcadeRound(options.arcadeNow); rounds.set(socket.id, round);
      reply({ ok: true, data: round.snapshot() });
    });
    socket.on('arcade:jump', (input, reply) => {
      if (typeof reply !== 'function') return;
      const round = rounds.get(socket.id);
      if (!round) return reply({ ok: false, error: 'Esta partida já terminou.' });
      const accepted = round.jump(input);
      finishRound(socket.id, round);
      if (!accepted) return reply({ ok: false, error: 'Aguarde o próximo salto.' });
      reply({ ok: true, data: round.snapshot() });
    });
    socket.on('arcade:leave', () => { rounds.delete(socket.id); });
    socket.on('firefly:start', reply => {
      if (typeof reply !== 'function') return;
      const player = players.get(socket.id);
      if (rounds.has(socket.id) || fireflyRounds.has(socket.id)) return reply({ ok: false, error: 'Você já está jogando.' });
      if (!player || arcadeDistance(player, FIREFLY) > FIREFLY.enterRadius) return reply({ ok: false, error: 'Chegue perto do fliperama para jogar.' });
      paths.delete(socket.id); player.moving = false;
      const round = new FireflyRound(options.arcadeNow); fireflyRounds.set(socket.id, round);
      reply({ ok: true, data: round.snapshot() });
    });
    socket.on('firefly:hit', (input, reply) => {
      if (typeof reply !== 'function') return;
      const round = fireflyRounds.get(socket.id);
      if (!round) return reply({ ok: false, error: 'Esta partida já terminou.' });
      const accepted = round.hit(input);
      finishFirefly(socket.id, round);
      if (!accepted) {
        if (round.status === 'playing') socket.emit('firefly:state', round.snapshot());
        return reply({ ok: false, error: 'Aguarde o próximo vagalume.' });
      }
      reply({ ok: true, data: round.snapshot() });
    });
    socket.on('firefly:leave', () => { fireflyRounds.delete(socket.id); });
    socket.on('arcade:ranking', reply => {
      const player = players.get(socket.id);
      if (typeof reply !== 'function') return;
      if (!player) return reply({ ok: false, error: 'Entre na praça para ver o ranking.' });
      void scores.ranking(player.nickname).then(data => reply({ ok: true, data }));
    });
    socket.on('chat:send', (input, reply) => {
      if (typeof reply !== 'function') return;
      const player = players.get(socket.id), text = parseMessage(input), now = Date.now();
      if (!player) return reply({ ok: false, error: 'Entre na praça para conversar.' });
      if (!text) return reply({ ok: false, error: 'Escreva uma mensagem de até 200 caracteres.' });
      if (now - lastMessage < 1000) return reply({ ok: false, error: 'Um pulinho de cada vez! Espere um segundo para enviar.' });
      lastMessage = now;
      const message: ChatMessage = { id: randomUUID(), playerId: player.id, nickname: player.nickname, color: player.color, appearance: { ...player.appearance }, text, sentAt: now };
      messages.push(message);
      if (messages.length > 50) messages.shift();
      io.to('plaza').emit('chat:message', message);
      reply({ ok: true, data: undefined });
    });
    socket.on('player:leave', leave);
    socket.on('disconnect', leave);
  });
  let previous = performance.now();
  const timer = setInterval(() => {
    for (const [id, round] of rounds) { round.expire(); finishRound(id, round); }
    for (const [id, round] of fireflyRounds) {
      if (round.advance()) {
        if (round.status === 'playing') io.to(id).emit('firefly:state', round.snapshot());
        else finishFirefly(id, round);
      }
    }
    const now = performance.now(), delta = Math.min((now - previous) / 1000, 0.2); previous = now;
    for (const player of players.values()) {
      const path = paths.get(player.id);
      let budget = WORLD.speed * delta;
      player.moving = !!path?.length;
      while (path?.length && budget > 0) {
        const target = path[0], dx = target.x - player.x, dy = target.y - player.y, distance = Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.1) player.facing = dx >= 0 ? 1 : -1;
        if (distance <= budget) { player.x = target.x; player.y = target.y; path.shift(); budget -= distance; }
        else { player.x += dx / distance * budget; player.y += dy / distance * budget; budget = 0; }
      }
      player.moving = !!path?.length;
    }
    if (players.size) io.to('plaza').emit('world:positions', [...players.values()]);
  }, 100);
  return {
    http, io,
    close: async () => { clearInterval(timer); await new Promise<void>(done => io.close(() => done())); await scores.flush(); },
    listen: (port = 3000, host = '0.0.0.0') => new Promise<number>(done => http.listen(port, host, () => { const address = http.address(); done(typeof address === 'object' && address ? address.port : port); }))
  };
}
