import type { Socket } from 'socket.io-client';
import type { ClientEvents, Player, ServerEvents } from '../shared/protocol';
import { ArcadeProximity, type ArcadeRanking } from '../shared/arcade';
import { FIREFLY, type FireflyState } from '../shared/firefly';
import './firefly.css';

export class FireflyUI {
  private proximity = new ArcadeProximity(FIREFLY);
  private dialog = document.createElement('dialog');
  private prompt = document.createElement('section');
  private round: FireflyState | null = null;
  private ranking: ArcadeRanking | null = null;
  private busy = false;
  private generation = 0;
  private rankingVersion = 0;
  private saving = false;
  private remainingUntil = 0;
  private previousFocus: HTMLElement | null = null;
  private tick?: ReturnType<typeof setInterval>;

  constructor(private socket: Socket<ServerEvents, ClientEvents>, private changed: () => void, private canOpen: () => boolean) {
    this.prompt.id = 'firefly-invite';
    this.prompt.className = 'arcade-invite firefly-invite';
    this.prompt.hidden = true;
    this.prompt.setAttribute('aria-label', 'Convite do Pega-Vagalumes');
    this.prompt.innerHTML = `<span class="arcade-eyebrow">MINIFLIPERAMA DO BREJO</span><p role="status">Quer jogar Pega-Vagalumes?</p>
      <div class="arcade-actions"><button type="button" data-play>Jogar</button><button type="button" data-decline>Agora não</button></div>`;
    document.querySelector('.world-panel')!.append(this.prompt);
    this.prompt.querySelector<HTMLButtonElement>('[data-play]')!.onclick = () => this.open();
    this.prompt.querySelector<HTMLButtonElement>('[data-decline]')!.onclick = () => { this.prompt.hidden = true; };

    this.dialog.id = 'firefly-dialog';
    this.dialog.className = 'arcade-dialog firefly-dialog';
    this.dialog.setAttribute('aria-labelledby', 'firefly-title');
    this.dialog.innerHTML = `<div class="arcade-heading"><div><span class="arcade-eyebrow">MINIFLIPERAMA DO BREJO</span><h2 id="firefly-title">Pega-Vagalumes</h2></div><button type="button" data-close aria-label="Sair do Pega-Vagalumes">×</button></div>
      <div class="arcade-layout"><section class="arcade-game"><p class="arcade-instructions">Toque no vagalume aceso ou pressione de <kbd>1</kbd> a <kbd>9</kbd>. Cada acerto vale 10 pontos. Ele muda de lugar a cada 1,5 segundo!</p>
      <div class="arcade-meters"><span>PONTOS <strong data-score>0</strong></span><span>TEMPO <strong data-time>60s</strong></span></div>
      <div class="firefly-board" role="group" aria-label="Grade de vagalumes"></div>
      <p data-status role="status" class="arcade-status">Preparando os vagalumes…</p>
      <div class="arcade-actions" data-finished hidden><button type="button" data-retry>Jogar novamente</button><button type="button" data-back>Voltar ao brejo</button></div></section>
      <aside class="arcade-ranking"><span class="arcade-eyebrow">OS GRANDES JOGADORES</span><h3>Ranking do brejo</h3><p data-best>Seu recorde: —</p><ol data-ranking></ol><p data-ranking-status role="status">Carregando ranking…</p><small>Vale a maior partida em qualquer fliperama.<br/>Os recordes ficam salvos.</small></aside></div>`;
    document.body.append(this.dialog);
    const board = this.get('.firefly-board');
    for (let cell = 0; cell < 9; cell++) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.cell = String(cell);
      button.setAttribute('aria-label', `Posição ${cell + 1}`);
      button.innerHTML = `<span class="firefly-light" aria-hidden="true">✦</span><span class="firefly-number">${cell + 1}</span>`;
      button.onclick = () => this.hit(cell);
      board.append(button);
    }
    this.get<HTMLButtonElement>('[data-close]').onclick = () => this.close();
    this.get<HTMLButtonElement>('[data-back]').onclick = () => this.close();
    this.get<HTMLButtonElement>('[data-retry]').onclick = () => this.start();
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    document.addEventListener('keydown', event => {
      if (!this.active) return;
      event.stopPropagation();
      if (/^[1-9]$/.test(event.key) && !event.repeat) { event.preventDefault(); this.hit(Number(event.key) - 1); }
    }, true);
    socket.on('firefly:state', state => { if (this.active && this.round?.id === state.id) this.receive(state); });
    socket.on('arcade:ranking', ranking => { this.rankingVersion++; this.ranking = ranking; this.saving = false; if (this.active) this.renderRanking(); });
  }
  private get<T extends HTMLElement = HTMLElement>(selector: string) { return this.dialog.querySelector<T>(selector)!; }
  get active() { return this.dialog.open; }
  update(player: Player) {
    if (player.mapId !== 'plaza') { this.proximity.reset(); this.prompt.hidden = true; return; }
    if (this.active) return;
    const action = this.proximity.update(player);
    if (action === 'open') this.prompt.hidden = false;
    if (action === 'close') this.prompt.hidden = true;
  }
  reset() { this.close(); this.proximity.reset(); this.ranking = null; this.prompt.hidden = true; }
  private open() {
    if (this.active || !this.socket.connected || !this.canOpen()) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.prompt.hidden = true;
    this.dialog.showModal(); this.changed();
    this.tick = setInterval(() => this.refreshControls(), 50);
    this.start(); this.requestRanking();
  }
  close() {
    const wasOpen = this.active;
    this.generation++; this.round = null; this.busy = false; this.saving = false;
    if (this.tick) clearInterval(this.tick);
    this.tick = undefined;
    if (wasOpen) {
      if (this.socket.connected) this.socket.emit('firefly:leave');
      this.dialog.close(); this.changed();
      const focus = this.previousFocus;
      if (focus?.isConnected && !focus.closest('[hidden], [inert]')) focus.focus();
      else document.querySelector<HTMLTextAreaElement>('#message-input')?.focus();
    }
  }
  private start() {
    if (this.busy || !this.active) return;
    const generation = ++this.generation;
    this.busy = true; this.round = null; this.saving = false;
    this.get('[data-status]').textContent = 'Preparando os vagalumes…';
    this.get('[data-score]').textContent = '0'; this.get('[data-time]').textContent = '60s';
    this.get('[data-finished]').hidden = true;
    this.renderBoard(); this.renderRanking(); this.refreshControls();
    this.socket.timeout(5000).emit('firefly:start', (error, reply) => {
      if (!this.active || generation !== this.generation) return;
      this.busy = false;
      if (error || !reply?.ok) {
        this.socket.emit('firefly:leave');
        this.get('[data-status]').textContent = error ? 'Não conseguimos iniciar. Tente novamente.' : reply && !reply.ok ? reply.error : 'Não conseguimos iniciar.';
        this.get('[data-finished]').hidden = false; this.refreshControls(); this.get('[data-retry]').focus(); return;
      }
      this.receive(reply.data); this.get<HTMLButtonElement>('[data-cell="0"]').focus();
    });
  }
  private receive(state: FireflyState) {
    if (this.round && (this.round.id !== state.id || state.sequence < this.round.sequence)) return;
    const finishedBefore = this.round?.status !== 'playing' && !!this.round;
    this.round = state;
    this.remainingUntil = performance.now() + state.remainingMs;
    this.get('[data-score]').textContent = String(state.score);
    this.get('[data-status]').textContent = state.status === 'timeout' ? `Tempo esgotado! Você fez ${state.score} pontos.` : 'Pegue o vagalume aceso!';
    this.get('[data-finished]').hidden = state.status === 'playing';
    if (state.status !== 'playing') this.busy = false;
    this.renderBoard(); this.refreshControls();
    if (state.status !== 'playing' && !finishedBefore) {
      this.saving = true; this.rankingVersion++; this.renderRanking(); this.get('[data-retry]').focus();
      this.requestRanking();
    }
  }
  private hit(cell: number) {
    if (!this.round || this.round.status !== 'playing' || this.busy || performance.now() >= this.remainingUntil) return;
    const generation = this.generation;
    this.busy = true; this.refreshControls();
    this.socket.timeout(5000).emit('firefly:hit', { id: this.round.id, sequence: this.round.sequence, cell }, (error, reply) => {
      if (!this.active || generation !== this.generation) return;
      this.busy = false;
      if (error) {
        this.socket.emit('firefly:leave'); this.round = null;
        this.get('[data-status]').textContent = 'A conexão falhou. Esta tentativa foi cancelada.';
        this.get('[data-finished]').hidden = false; this.renderBoard(); this.refreshControls(); this.get('[data-retry]').focus(); return;
      }
      if (reply?.ok) this.receive(reply.data);
      else if (this.round?.status === 'playing') this.get('[data-status]').textContent = reply && !reply.ok ? reply.error : 'Tente novamente.';
      this.refreshControls();
    });
  }
  private renderBoard() {
    this.get('.firefly-board').querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
      const lit = this.round?.status === 'playing' && this.round.target === index;
      button.classList.toggle('lit', !!lit);
      button.setAttribute('aria-label', lit ? `Vagalume na posição ${index + 1}` : `Posição ${index + 1}`);
    });
  }
  private refreshControls() {
    const playing = this.round?.status === 'playing';
    const remaining = this.round && !playing ? this.round.remainingMs : Math.max(0, this.remainingUntil - performance.now());
    if (this.round) this.get('[data-time]').textContent = `${Math.ceil(remaining / 1000)}s`;
    this.get('.firefly-board').querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = !playing || this.busy || remaining <= 0; });
    this.get<HTMLButtonElement>('[data-retry]').disabled = this.busy;
  }
  private requestRanking() {
    const generation = this.generation, version = this.rankingVersion;
    this.socket.timeout(5000).emit('arcade:ranking', (error, reply) => {
      if (!this.active || generation !== this.generation || version !== this.rankingVersion) return;
      this.rankingVersion++; this.saving = false;
      this.ranking = !error && reply?.ok ? reply.data : { available: false, entries: [], personalBest: 0 };
      this.renderRanking();
    });
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
