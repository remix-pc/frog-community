import type { Socket } from 'socket.io-client';
import { DEFAULT_APPEARANCE, type Appearance, type ClientEvents, type Player, type ServerEvents } from '../shared/protocol';
import { ARCADE, ArcadeProximity, type ArcadeRanking, type ArcadeState, type Direction } from '../shared/arcade';
import { dataSvg, frogSvg } from './art';
import './arcade.css';

export class ArcadeUI {
  private proximity = new ArcadeProximity();
  private dialog = document.createElement('dialog');
  private prompt = document.createElement('section');
  private round: ArcadeState | null = null;
  private ranking: ArcadeRanking | null = null;
  private busy = false;
  private generation = 0;
  private remainingUntil = 0;
  private jumpingUntil = 0;
  private previousFocus: HTMLElement | null = null;
  private color = '#80b85c';
  private appearance: Appearance = DEFAULT_APPEARANCE;
  private landed: Direction | null = null;
  private saving = false;
  private rankingVersion = 0;
  private tick: ReturnType<typeof setInterval> | undefined;
  constructor(private socket: Socket<ServerEvents, ClientEvents>, private changed: () => void) {
    this.prompt.id = 'arcade-invite';
    this.prompt.className = 'arcade-invite'; this.prompt.hidden = true;
    this.prompt.setAttribute('aria-label', 'Convite do fliperama');
    this.prompt.innerHTML = `<span class="arcade-eyebrow">FLIPERAMA DO BREJO</span><p role="status">Quer jogar Pulo do Sapo?</p>
      <div class="arcade-actions"><button type="button" data-play>Jogar</button><button type="button" data-decline>Agora não</button></div>`;
    document.querySelector('.world-panel')!.append(this.prompt);
    this.prompt.querySelector<HTMLButtonElement>('[data-play]')!.onclick = () => this.open();
    this.prompt.querySelector<HTMLButtonElement>('[data-decline]')!.onclick = () => { this.prompt.hidden = true; };
    this.dialog.id = 'arcade-dialog'; this.dialog.className = 'arcade-dialog';
    this.dialog.setAttribute('aria-labelledby', 'arcade-title');
    this.dialog.innerHTML = `<div class="arcade-heading"><div><span class="arcade-eyebrow">FLIPERAMA DO BREJO</span><h2 id="arcade-title">Pulo do Sapo</h2></div><button type="button" data-close aria-label="Sair do fliperama">×</button></div>
      <div class="arcade-layout"><section class="arcade-game"><p class="arcade-instructions">Siga as vitórias-régias com <kbd>←</kbd> e <kbd>→</kbd> ou os botões. Cada salto vale 10 pontos. Caiu na água, acabou!</p>
      <div class="arcade-meters"><span>PONTOS <strong data-score>0</strong></span><span>TEMPO <strong data-time>60s</strong></span></div>
      <div class="arcade-water" aria-label="Caminho de vitórias-régias"><div data-platforms></div><div class="arcade-current"><img data-frog alt="Seu sapo"/></div></div>
      <p data-status role="status" class="arcade-status">Preparando o salto…</p>
      <div class="arcade-actions" data-controls><button type="button" data-left aria-label="Saltar para a esquerda">← Esquerda</button><button type="button" data-right aria-label="Saltar para a direita">Direita →</button></div>
      <div class="arcade-actions" data-finished hidden><button type="button" data-retry>Jogar novamente</button><button type="button" data-back>Voltar ao brejo</button></div></section>
      <aside class="arcade-ranking"><span class="arcade-eyebrow">OS GRANDES JOGADORES</span><h3>Ranking do brejo</h3><p data-best>Seu recorde: —</p><ol data-ranking></ol><p data-ranking-status role="status">Carregando ranking…</p><small>Vale a maior partida em qualquer fliperama.<br/>Os recordes ficam salvos.</small></aside></div>`;
    document.body.append(this.dialog);
    this.get<HTMLButtonElement>('[data-close]').onclick = () => this.close();
    this.get<HTMLButtonElement>('[data-back]').onclick = () => this.close();
    this.get<HTMLButtonElement>('[data-retry]').onclick = () => this.start();
    this.get<HTMLButtonElement>('[data-left]').onclick = () => this.jump('left');
    this.get<HTMLButtonElement>('[data-right]').onclick = () => this.jump('right');
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    document.addEventListener('keydown', event => {
      if (!this.active) return;
      event.stopPropagation();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); if (!event.repeat) this.jump(event.key === 'ArrowLeft' ? 'left' : 'right');
      }
      if (event.key === 'Tab') {
        const buttons = [...this.dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(b => !b.closest('[hidden]'));
        const first = buttons[0], last = buttons.at(-1);
        if (!this.dialog.contains(document.activeElement)) { event.preventDefault(); first?.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }, true);
    socket.on('arcade:state', state => {
      if (this.active && this.round?.id === state.id) this.receive(state);
    });
    socket.on('arcade:ranking', ranking => { this.rankingVersion++; this.ranking = ranking; this.saving = false; if (this.active) this.renderRanking(); });
  }
  private get<T extends HTMLElement = HTMLElement>(selector: string) { return this.dialog.querySelector<T>(selector)!; }
  get active() { return this.dialog.open; }
  update(player: Player) {
    this.color = player.color;
    this.appearance = player.appearance;
    if (this.active) return;
    const action = this.proximity.update(player);
    if (action === 'open') this.prompt.hidden = false;
    if (action === 'close') this.prompt.hidden = true;
  }
  reset() { this.close(); this.proximity.reset(); this.ranking = null; this.prompt.hidden = true; }
  private open() {
    if (this.active || !this.socket.connected) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.prompt.hidden = true;
    this.dialog.showModal(); this.changed();
    this.tick = setInterval(() => this.refreshControls(), 50);
    this.start();
    this.requestRanking();
  }
  private requestRanking() {
    const generation = this.generation, version = this.rankingVersion;
    this.socket.timeout(5000).emit('arcade:ranking', (error, reply) => {
      // A late query must not replace a newer pushed ranking or a new round's result.
      if (!this.active || generation !== this.generation || version !== this.rankingVersion) return;
      this.rankingVersion++; this.saving = false;
      this.ranking = !error && reply?.ok ? reply.data : { available: false, entries: [], personalBest: 0 };
      this.renderRanking();
    });
  }
  close() {
    const wasOpen = this.active;
    this.generation++; this.round = null; this.busy = false; this.saving = false;
    if (this.tick) clearInterval(this.tick);
    this.tick = undefined;
    if (wasOpen) {
      if (this.socket.connected) this.socket.emit('arcade:leave');
      this.dialog.close(); this.changed();
      const focus = this.previousFocus;
      if (focus?.isConnected && !focus.closest('[hidden], [inert]')) focus.focus();
      else document.querySelector<HTMLTextAreaElement>('#message-input')?.focus();
    }
  }
  private start() {
    if (this.busy || !this.active) return;
    const generation = ++this.generation;
    this.busy = true; this.round = null; this.landed = null; this.jumpingUntil = 0; this.saving = false;
    this.get('[data-status]').textContent = 'Preparando o salto…';
    this.get('[data-finished]').hidden = true; this.get('[data-controls]').hidden = false;
    this.get('[data-score]').textContent = '0'; this.get('[data-time]').textContent = '60s';
    this.get('[data-platforms]').replaceChildren(); this.get('.arcade-water').classList.remove('is-fallen');
    this.get<HTMLImageElement>('[data-frog]').src = dataSvg(frogSvg(this.color, this.appearance));
    this.get('[data-frog]').getAnimations().forEach(animation => animation.cancel());
    this.get('[data-frog]').style.transform = '';
    this.renderRanking(); this.refreshControls();
    this.socket.timeout(5000).emit('arcade:start', (error, reply) => {
      if (!this.active || generation !== this.generation) return;
      this.busy = false;
      if (error || !reply?.ok) {
        this.socket.emit('arcade:leave');
        this.get('[data-status]').textContent = error ? 'Não conseguimos iniciar. Tente novamente.' : reply && !reply.ok ? reply.error : 'Não conseguimos iniciar.';
        this.get('[data-controls]').hidden = true; this.get('[data-finished]').hidden = false;
        this.get<HTMLButtonElement>('[data-retry]').disabled = false;
        this.get('[data-retry]').focus(); return;
      }
      this.receive(reply.data); this.get('[data-left]').focus();
    });
  }
  private receive(state: ArcadeState) {
    if (this.round && (this.round.id !== state.id || state.sequence < this.round.sequence)) return;
    const finishedBefore = this.round?.status !== 'playing' && !!this.round;
    this.round = state; this.remainingUntil = performance.now() + state.remainingMs;
    this.get('[data-score]').textContent = String(state.score);
    const platforms = this.get('[data-platforms]'); platforms.replaceChildren();
    [...state.platforms].reverse().forEach((direction, i) => {
      const row = document.createElement('div'); row.className = `arcade-row ${direction}`;
      row.dataset.direction = direction;
      row.setAttribute('aria-label', `${5 - i}º salto: ${direction === 'left' ? 'esquerda' : 'direita'}`);
      const pad = document.createElement('span'); pad.className = 'arcade-pad'; pad.textContent = String(5 - i); row.append(pad); platforms.append(row);
    });
    const finished = state.status !== 'playing';
    this.get('[data-controls]').hidden = finished; this.get('[data-finished]').hidden = !finished;
    this.get('.arcade-water').classList.toggle('is-fallen', state.status === 'fell');
    this.get('[data-status]').textContent = state.status === 'fell' ? `Splash! Você fez ${state.score} pontos.` : state.status === 'timeout' ? `Tempo esgotado! Você fez ${state.score} pontos.` : 'Siga a folha mais próxima. Boa sorte!';
    if (finished) this.busy = false;
    this.refreshControls();
    if (finished && !finishedBefore) {
      this.saving = true; this.rankingVersion++; this.renderRanking(); this.get('[data-retry]').focus();
      // The server's query waits for queued writes, also recovering a missed broadcast.
      this.requestRanking();
    }
  }
  private jump(direction: Direction) {
    if (!this.round || this.round.status !== 'playing' || this.busy || performance.now() < this.jumpingUntil || performance.now() >= this.remainingUntil) return;
    const generation = this.generation;
    this.busy = true; this.jumpingUntil = performance.now() + ARCADE.jumpDuration;
    const frog = this.get('[data-frog]');
    const previousX = this.landed === 'left' ? -65 : this.landed === 'right' ? 65 : 0;
    const nextX = direction === 'left' ? -65 : 65;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) frog.animate([{ transform: `translateX(${previousX}px)` }, { transform: `translate(${(previousX + nextX) / 2}px, -42px)` }, { transform: `translateX(${nextX}px)` }], { duration: ARCADE.jumpDuration });
    frog.style.transform = `translateX(${nextX}px)`; this.landed = direction;
    this.refreshControls();
    this.socket.timeout(5000).emit('arcade:jump', { id: this.round.id, sequence: this.round.sequence, direction }, (error, reply) => {
      if (!this.active || generation !== this.generation) return;
      this.busy = false;
      if (error) {
        this.socket.emit('arcade:leave'); this.round = null;
        this.get('[data-status]').textContent = 'A conexão falhou. Esta tentativa foi cancelada.';
        this.get('[data-controls]').hidden = true; this.get('[data-finished]').hidden = false;
        this.refreshControls(); this.get('[data-retry]').focus(); return;
      }
      if (reply?.ok) this.receive(reply.data);
      else if (this.round?.status === 'playing') this.get('[data-status]').textContent = reply && !reply.ok ? reply.error : 'Tente saltar novamente.';
      this.refreshControls();
    });
  }
  private refreshControls() {
    const playing = this.round?.status === 'playing';
    const remaining = this.round && !playing ? this.round.remainingMs : Math.max(0, this.remainingUntil - performance.now());
    if (this.round) this.get('[data-time]').textContent = `${Math.ceil(remaining / 1000)}s`;
    const disabled = !playing || this.busy || performance.now() < this.jumpingUntil || remaining <= 0;
    this.get<HTMLButtonElement>('[data-left]').disabled = disabled;
    this.get<HTMLButtonElement>('[data-right]').disabled = disabled;
    this.get<HTMLButtonElement>('[data-retry]').disabled = this.busy;
  }
  private renderRanking() {
    const list = this.get('[data-ranking]'); list.replaceChildren();
    const available = this.ranking?.available;
    this.get('[data-best]').textContent = `Seu recorde: ${available ? `${this.ranking!.personalBest} pontos` : '—'}`;
    this.get('[data-ranking-status]').textContent = this.saving ? 'Salvando resultado…' : !this.ranking ? 'Carregando ranking…' : !available ? 'Ranking indisponível. Os resultados não podem ser salvos agora.' : !this.ranking.entries.length ? 'O primeiro recorde pode ser seu!' : '';
    if (available) for (const entry of this.ranking!.entries) {
      const row = document.createElement('li'), name = document.createElement('span'), score = document.createElement('strong');
      name.textContent = entry.nickname; score.textContent = String(entry.score); row.append(name, score); list.append(row);
    }
  }
}
