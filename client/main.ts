import { io, type Socket } from 'socket.io-client';
import { COLORS, DEFAULT_APPEARANCE, GLASSES, HATS, OUTFITS, parseProfile, type Appearance, type ChatMessage, type ClientEvents, type Player, type Profile, type ServerEvents } from '../shared/protocol';
import { dataSvg, frogSvg } from './art';
import { createPlaza } from './scene';
import { ArcadeUI } from './arcade';
import { FireflyUI } from './firefly';
import { isNightInSaoPaulo } from './time';
import './style.css';
import './game-chat.css';
import './appearance.css';
import './time.css';

const icons = {
  chat: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 1-8 8H5l-4 3 1.7-6A8 8 0 1 1 20 11Z"/><path d="M7 10h8M7 14h5"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M20 3C10 2 3 6 4 13s14 9 16-10ZM3 22 15 10"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M10 4H4v16h6m3-13 5 5-5 5m-5-5h12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24"><path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 14 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></svg>'
};
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar">
    <a class="brand" href="/" aria-label="Frog Community — início"><img src="/favicon.svg" alt=""/><span>frog<span class="brand-light">community</span></span></a>
    <div class="top-location">${icons.leaf}<span>Um cantinho para estar junto.</span></div>
    <div class="connection" role="status"><i></i><span id="connection-label">Conectando…</span></div>
  </header>
  <main class="layout">
    <section class="world-panel" aria-label="Praça do Brejo: clique na grama ou no caminho para andar">
      <div id="world"></div>
      <div class="location-card"><span class="location-icon">${icons.leaf}</span><div><small>SEU PONTO DE ENCONTRO</small><h1>Praça do Brejo</h1></div><span class="live-dot" title="Praça online"></span></div>
      <div class="world-caption" id="world-caption"><span class="sun-symbol">☀</span><span id="world-time-label">Um bom dia para dar um pulo.</span></div>
      <div class="world-help"><span class="mouse-icon"></span>Clique no chão para explorar<span class="help-separator"></span><kbd>Enter</kbd> para conversar</div>
      <div id="toast" class="toast" role="status" hidden></div>
      <div class="world-signature">DEVAGAR TAMBÉM É UM CAMINHO.</div>
    <aside id="game-chat" class="sidebar game-chat" aria-label="Chat dentro da praça">
      <div class="chat-toolbar"><div class="tabs" role="tablist" aria-label="Painéis da comunidade"><button id="chat-tab" class="tab active" role="tab" aria-selected="true" aria-controls="chat-panel">${icons.chat}Conversa</button><button id="people-tab" class="tab" role="tab" aria-selected="false" aria-controls="people-panel">${icons.users}Na praça <span id="people-count">0</span></button></div><button id="toggle-chat" class="icon-button" aria-label="Recolher histórico" title="Recolher histórico" aria-expanded="true" aria-controls="chat-content">−</button></div>
      <div id="chat-content">
      <section id="chat-panel" class="chat-panel" role="tabpanel" aria-labelledby="chat-tab"><div id="messages" class="messages" role="log" aria-live="polite" aria-label="Mensagens públicas"></div></section>
      <section id="people-panel" class="people-panel" role="tabpanel" aria-labelledby="people-tab" hidden><p class="people-hint">Gente boa dividindo o mesmo cantinho.<br/>Silencie alguém para ocultar suas mensagens.</p><ul id="people-list"></ul></section>
      </div>
      <div class="composer-wrap"><form id="chat-form"><label class="sr-only" for="message-input">Mensagem para a praça</label><textarea id="message-input" rows="1" maxlength="200" placeholder="Fale com os sapos da praça…" disabled></textarea><div class="composer-bottom"><span id="message-count">0 / 200</span><button id="send-button" type="submit" aria-label="Enviar mensagem" disabled>${icons.arrow}</button></div></form><p class="chat-hint">${icons.chat} Sua mensagem aparece em um balão no seu sapo.</p></div>
    </aside>
      <div class="self-card"><img id="self-avatar" alt="Seu sapo"/><div><strong id="self-name">Seu lugar está aqui</strong><span id="self-detail">Escolha um sapo e entre</span></div><button id="customize-button" class="icon-button" aria-label="Personalizar sapo" title="Personalizar sapo" disabled>${icons.sparkle}</button><button id="leave-button" class="icon-button" aria-label="Sair da praça" title="Sair da praça" disabled>${icons.exit}</button></div>
    </section>
  </main>
  <footer class="footer"><span>FEITO DE PEQUENOS ENCONTROS.</span><span>Um brejo. Muitas histórias. <span class="footer-flower">✳</span></span><span>FROG COMMUNITY · ALPHA</span></footer>
  <div id="entry" class="entry-overlay">
    <section class="entry-card" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <div class="entry-art"><div class="entry-art-note">SEU NOVO CANTINHO<br/>NA INTERNET</div><span class="art-spark spark-one">✳</span><span class="art-spark spark-two">✦</span><div class="preview-pad"></div><img id="frog-preview" alt="Prévia do seu sapo"/><div class="preview-ripple"></div><p>Gente boa.<br/>Papos leves.<br/><em>Vida de sapo.</em></p><span class="art-bottom">EST. 2026 &nbsp; · &nbsp; TODO MUNDO CABE NO BREJO</span></div>
      <div class="entry-content"><span class="eyebrow">BEM-VINDO À FROG COMMUNITY</span><h1 id="entry-title">Dê um pulo.<br/>Fique à vontade.</h1><p class="entry-description">Um lugar para encontrar amigos, jogar conversa fora e aproveitar a vida no brejo.</p>
        <form id="entry-form"><div class="entry-fields"><label for="nickname">Como podemos te chamar?</label><input id="nickname" name="nickname" placeholder="Seu apelido no brejo" minlength="3" maxlength="20" required autocomplete="nickname"/><div class="color-heading"><span id="color-label">Escolha a sua cor</span><span id="color-name">Folha</span></div><div id="colors" class="colors" role="group" aria-labelledby="color-label"></div><div id="entry-appearance" class="appearance-options"></div></div><div class="entry-actions"><p id="entry-error" class="form-error" role="alert"></p><button id="join-button" class="primary-button" type="submit">Entrar no brejo ${icons.arrow}</button></div></form>
        <p class="entry-footnote">Sem cadastro. Só você e seu próximo encontro.</p>
      </div>
    </section>
  </div>
  <dialog id="appearance-dialog" class="appearance-dialog" aria-labelledby="appearance-title"><div class="appearance-dialog-head"><div><span class="eyebrow">SEU ESTILO NO BREJO</span><h2 id="appearance-title">Personalize seu sapo</h2></div><button id="appearance-close" class="icon-button" type="button" aria-label="Fechar personalização">×</button></div><div class="appearance-dialog-body"><div class="appearance-preview"><img id="appearance-preview-image" alt="Prévia do seu sapo"/><span>Experimente à vontade</span></div><div id="dialog-appearance" class="appearance-options"></div></div><p id="appearance-error" class="form-error" role="alert"></p><div class="appearance-actions"><button id="appearance-cancel" type="button">Cancelar</button><button id="appearance-save" type="button" class="primary-button">Salvar visual ${icons.arrow}</button></div></dialog>`;

function el<T extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id)! as T; }
const socket: Socket<ServerEvents, ClientEvents> = io({ autoConnect: true, reconnection: true });
const { scene } = createPlaza(el('world'));
function updateTimeOfDay() {
  const night = isNightInSaoPaulo();
  scene.setNight(night);
  document.querySelector<HTMLElement>('.world-panel')!.dataset.timeOfDay = night ? 'night' : 'day';
  el('world-caption').dataset.timeOfDay = night ? 'night' : 'day';
  el('world-caption').querySelector('.sun-symbol')!.textContent = night ? '☾' : '☀';
  el('world-time-label').textContent = night ? 'Uma boa noite para dar um pulo.' : 'Um bom dia para dar um pulo.';
}
updateTimeOfDay();
setInterval(updateTimeOfDay, 30_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateTimeOfDay(); });
let selectedColor: string = COLORS[0].hex;
let selectedAppearance: Appearance = { ...DEFAULT_APPEARANCE };
let draftAppearance: Appearance = { ...DEFAULT_APPEARANCE };
let savingAppearance = false;
let profile: Profile | null = null, selfId = '', joined = false, joining = false, sending = false;
let players: Player[] = [], messages: ChatMessage[] = [];
const muted = new Set<string>();
let toastTimer: ReturnType<typeof setTimeout>;
const arcade = new ArcadeUI(socket, controls);
const firefly = new FireflyUI(socket, controls, () => !arcade.active && !appearanceDialog.open);
const appearanceDialog = el<HTMLDialogElement>('appearance-dialog');
try { const saved = parseProfile(JSON.parse(localStorage.getItem('frog-profile') || 'null')); if (saved) { el<HTMLInputElement>('nickname').value = saved.nickname; selectedColor = saved.color; selectedAppearance = saved.appearance; } } catch { /* Storage may be unavailable in private browsers. */ }
const appearanceGroups = [
  { key: 'outfit', title: 'Roupas', options: OUTFITS },
  { key: 'glasses', title: 'Óculos', options: GLASSES },
  { key: 'hat', title: 'Chapéus', options: HATS }
] as const;
let entryCategory: keyof Appearance = 'outfit';
function renderAppearanceOptions(id: string, current: Appearance, color: string, changed: (next: Appearance) => void) {
  const container = el(id); container.replaceChildren();
  const entry = id === 'entry-appearance';
  if (entry) {
    const tabs = document.createElement('div'); tabs.className = 'appearance-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Tipos de acessórios');
    appearanceGroups.forEach((group, index) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.id = `entry-appearance-tab-${group.key}`;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(entryCategory === group.key)); tab.setAttribute('aria-controls', 'entry-appearance-panel');
      tab.textContent = group.title;
      const activate = () => { entryCategory = group.key; updateEntryPreview(); el(`entry-appearance-tab-${group.key}`).focus(); };
      tab.onclick = activate;
      tab.onkeydown = event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        entryCategory = appearanceGroups[(index + offset + appearanceGroups.length) % appearanceGroups.length].key;
        updateEntryPreview(); el(`entry-appearance-tab-${entryCategory}`).focus();
      };
      tabs.append(tab);
    });
    container.append(tabs);
  }
  for (const group of appearanceGroups) {
    if (entry && entryCategory !== group.key) continue;
    const section = document.createElement('section'); section.className = 'appearance-group';
    const heading = document.createElement('h3'); heading.textContent = group.title;
    if (entry) { section.id = 'entry-appearance-panel'; section.setAttribute('role', 'tabpanel'); section.setAttribute('aria-labelledby', `entry-appearance-tab-${group.key}`); heading.className = 'sr-only'; }
    const choices = document.createElement('div'); choices.className = 'appearance-choices'; choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', group.title);
    for (const option of group.options) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'appearance-choice';
      button.setAttribute('aria-label', `${group.title}: ${option.name}`);
      button.setAttribute('aria-pressed', String(current[group.key] === option.id));
      button.dataset.key = group.key; button.dataset.option = option.id || 'none';
      const image = document.createElement('img'); image.alt = '';
      image.src = dataSvg(frogSvg(color, { ...DEFAULT_APPEARANCE, [group.key]: option.id } as Appearance));
      const name = document.createElement('span'); name.textContent = option.name;
      button.append(image, name);
      button.onclick = () => {
        changed({ ...current, [group.key]: option.id } as Appearance);
        container.querySelector<HTMLButtonElement>(`[data-key="${group.key}"][data-option="${option.id || 'none'}"]`)?.focus();
      };
      choices.append(button);
    }
    section.append(heading, choices); container.append(section);
  }
}
function updateEntryPreview() {
  const image = dataSvg(frogSvg(selectedColor, selectedAppearance));
  el<HTMLImageElement>('frog-preview').src = image;
  if (!profile) el<HTMLImageElement>('self-avatar').src = image;
  renderAppearanceOptions('entry-appearance', selectedAppearance, selectedColor, next => { selectedAppearance = next; updateEntryPreview(); });
}
function chooseColor(color: string) {
  selectedColor = color;
  updateEntryPreview();
  el('color-name').textContent = COLORS.find(c => c.hex === color)!.name;
  for (const button of el('colors').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.color === color));
}
for (const color of COLORS) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'color-choice'; button.style.setProperty('--swatch', color.hex); button.dataset.color = color.hex; button.setAttribute('aria-label', color.name); button.title = color.name; button.addEventListener('click', () => chooseColor(color.hex)); el('colors').append(button);
}
chooseColor(selectedColor);
function updateDialogPreview() {
  el<HTMLImageElement>('appearance-preview-image').src = dataSvg(frogSvg(profile?.color || selectedColor, draftAppearance));
  renderAppearanceOptions('dialog-appearance', draftAppearance, profile?.color || selectedColor, next => { draftAppearance = next; updateDialogPreview(); });
}
function commitAppearance(appearance: Appearance) {
  if (!profile) return;
  profile = { ...profile, appearance };
  selectedAppearance = appearance;
  updateEntryPreview();
  el<HTMLImageElement>('self-avatar').src = dataSvg(frogSvg(profile.color, appearance));
  try { localStorage.setItem('frog-profile', JSON.stringify(profile)); } catch { /* Preferences are optional. */ }
}
function closeAppearance() { if (savingAppearance) return; if (appearanceDialog.open) appearanceDialog.close(); controls(); }
el('customize-button').onclick = () => {
  if (!joined || !profile || !socket.connected || arcade.active || firefly.active) return;
  draftAppearance = { ...profile.appearance };
  el('appearance-error').textContent = '';
  updateDialogPreview();
  appearanceDialog.showModal();
  controls();
  el<HTMLButtonElement>('appearance-close').focus();
};
el('appearance-close').onclick = closeAppearance;
el('appearance-cancel').onclick = closeAppearance;
appearanceDialog.addEventListener('close', () => { controls(); if (joined) el('customize-button').focus(); });
appearanceDialog.addEventListener('cancel', event => { if (savingAppearance) event.preventDefault(); });
el('appearance-save').onclick = () => {
  if (!profile || !joined || !socket.connected) return;
  savingAppearance = true; controls(); el('appearance-error').textContent = '';
  socket.timeout(6000).emit('player:appearance', draftAppearance, (error, reply) => {
    if (!appearanceDialog.open) return;
    savingAppearance = false; controls();
    if (error || !reply?.ok) { el('appearance-error').textContent = error ? 'Não conseguimos salvar. Tente novamente.' : reply && !reply.ok ? reply.error : 'Não conseguimos salvar.'; return; }
    commitAppearance(reply.data);
    closeAppearance();
  });
};
function toast(message: string) { el('toast').textContent = message; el('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el('toast').hidden = true; }, 3500); }
function status(text: string, online: boolean) { el('connection-label').textContent = text; document.querySelector('.connection')!.classList.toggle('online', online); }
function controls() {
  const ready = joined && socket.connected;
  scene.setEnabled(ready && !arcade.active && !firefly.active && !appearanceDialog.open); el<HTMLTextAreaElement>('message-input').disabled = !ready; el<HTMLButtonElement>('send-button').disabled = !ready || sending; el<HTMLButtonElement>('leave-button').disabled = !profile;
  el<HTMLButtonElement>('customize-button').disabled = !ready || arcade.active || firefly.active;
  el<HTMLButtonElement>('appearance-save').disabled = !ready || savingAppearance;
  el<HTMLButtonElement>('appearance-cancel').disabled = savingAppearance;
  el<HTMLButtonElement>('appearance-close').disabled = savingAppearance;
  el<HTMLButtonElement>('join-button').disabled = !socket.connected || joining;
}
function renderMessages() {
  const box = el('messages'); const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.replaceChildren();
  const welcome = document.createElement('div'); welcome.className = 'welcome-note';
  const welcomeIcon = document.createElement('span'); welcomeIcon.className = 'welcome-icon'; welcomeIcon.innerHTML = icons.leaf;
  const strong = document.createElement('strong'); strong.textContent = 'Você chegou ao lugar certo.';
  const info = document.createElement('p'); info.textContent = 'Dê um oi, faça um amigo. Respeito e gentileza deixam nosso brejo mais bonito.';
  welcome.append(welcomeIcon, strong, info); box.append(welcome);
  for (const message of messages) {
    if (muted.has(message.playerId)) continue;
    const row = document.createElement('article'); row.className = 'message' + (message.playerId === selfId ? ' own-message' : '');
    const avatar = document.createElement('img'); avatar.src = dataSvg(frogSvg(message.color, message.appearance)); avatar.alt = '';
    const body = document.createElement('div'), heading = document.createElement('div'); heading.className = 'message-heading';
    const name = document.createElement('strong'); name.textContent = message.nickname;
    const time = document.createElement('time'); time.dateTime = new Date(message.sentAt).toISOString(); time.textContent = new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const text = document.createElement('p'); text.textContent = message.text;
    heading.append(name, time); body.append(heading, text); row.append(avatar, body); box.append(row);
  }
  if (atBottom) box.scrollTop = box.scrollHeight;
}
function renderPeople() {
  el('people-count').textContent = String(players.length);
  const list = el('people-list'); list.replaceChildren();
  for (const player of [...players].sort((a, b) => a.id === selfId ? -1 : b.id === selfId ? 1 : a.nickname.localeCompare(b.nickname))) {
    const row = document.createElement('li'), avatar = document.createElement('img'), name = document.createElement('span');
    avatar.src = dataSvg(frogSvg(player.color, player.appearance)); avatar.alt = ''; name.textContent = player.nickname + (player.id === selfId ? ' (você)' : ''); row.append(avatar, name);
    if (player.id !== selfId) {
      const button = document.createElement('button'); button.className = 'icon-button mute-button'; button.innerHTML = icons.soundOff; button.setAttribute('aria-label', `${muted.has(player.id) ? 'Ouvir' : 'Silenciar'} ${player.nickname}`); button.title = muted.has(player.id) ? 'Voltar a ouvir' : 'Silenciar'; button.setAttribute('aria-pressed', String(muted.has(player.id)));
      button.onclick = () => { if (muted.has(player.id)) muted.delete(player.id); else { muted.add(player.id); scene.removeBubble(player.id); } renderMessages(); renderPeople(); }; row.append(button);
    }
    list.append(row);
  }
}
function openTab(people: boolean) {
  setChatExpanded(true);
  el('chat-panel').hidden = people; el('people-panel').hidden = !people;
  el('chat-tab').classList.toggle('active', !people); el('people-tab').classList.toggle('active', people);
  el('chat-tab').setAttribute('aria-selected', String(!people)); el('people-tab').setAttribute('aria-selected', String(people));
  if (!people) el('messages').scrollTop = el('messages').scrollHeight;
}
function setChatExpanded(expanded: boolean) {
  el('chat-content').hidden = !expanded;
  const button = el('toggle-chat');
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('aria-label', expanded ? 'Recolher histórico' : 'Expandir histórico');
  button.title = expanded ? 'Recolher histórico' : 'Expandir histórico';
  button.textContent = expanded ? '−' : '+';
  if (expanded) el('messages').scrollTop = el('messages').scrollHeight;
}
el('toggle-chat').onclick = () => setChatExpanded(el('chat-content').hidden);
el('chat-tab').onclick = () => openTab(false); el('people-tab').onclick = () => openTab(true);
for (const id of ['chat-tab', 'people-tab']) el(id).addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { const people = id === 'chat-tab'; openTab(people); el(people ? 'people-tab' : 'chat-tab').focus(); event.preventDefault(); } });
function enter(candidate: Profile) {
  if (!socket.connected || joining) return;
  joining = true; el('entry-error').textContent = ''; controls();
  el('join-button').firstChild!.textContent = 'Um pulinho… ';
  socket.timeout(6000).emit('player:join', candidate, (error, reply) => {
    joining = false; el('join-button').firstChild!.textContent = 'Entrar no brejo ';
    if (error || !reply?.ok) {
      joined = false; profile = null; el('entry').hidden = false;
      el('entry-error').textContent = error ? 'Não conseguimos entrar. Tente novamente.' : !reply.ok ? reply.error : '';
      el('entry').removeAttribute('inert'); document.querySelector('.layout')!.setAttribute('inert', ''); controls(); return;
    }
    profile = candidate; selfId = reply.data.selfId; players = reply.data.state.players; messages = reply.data.state.messages; joined = true;
    scene.setSelf(selfId); scene.setPlayers(players); scene.clearBubbles();
    arcade.reset(); firefly.reset();
    el('entry').hidden = true; document.querySelector('.layout')!.removeAttribute('inert');
    el('self-name').textContent = profile.nickname; el('self-detail').textContent = 'De boa na praça'; el<HTMLImageElement>('self-avatar').src = dataSvg(frogSvg(profile.color, profile.appearance));
    try { localStorage.setItem('frog-profile', JSON.stringify(profile)); } catch { /* Preferences are optional. */ }
    renderMessages(); renderPeople(); controls(); el('messages').scrollTop = el('messages').scrollHeight; el<HTMLTextAreaElement>('message-input').focus();
  });
}
el('entry-form').addEventListener('submit', event => {
  event.preventDefault(); const candidate = parseProfile({ nickname: el<HTMLInputElement>('nickname').value, color: selectedColor, appearance: selectedAppearance });
  if (!candidate) { el('entry-error').textContent = 'Use de 3 a 20 letras, números, espaços, _ ou -.'; return; } enter(candidate);
});
el('leave-button').onclick = () => {
  closeAppearance();
  arcade.reset();
  firefly.reset();
  socket.emit('player:leave'); profile = null; selfId = ''; joined = false; players = []; messages = []; muted.clear(); scene.setSelf(''); scene.setPlayers([]); scene.clearBubbles();
  el('entry').hidden = false; document.querySelector('.layout')!.setAttribute('inert', ''); el('self-name').textContent = 'Seu lugar está aqui'; el('self-detail').textContent = 'Escolha um sapo e entre'; el('entry-error').textContent = ''; el<HTMLTextAreaElement>('message-input').value = ''; updateCount(); renderMessages(); renderPeople(); controls(); el('nickname').focus();
};
socket.on('connect', () => { status('Conectado ao brejo', true); if (profile) enter(profile); controls(); });
socket.on('disconnect', () => { savingAppearance = false; closeAppearance(); joined = false; joining = false; arcade.reset(); firefly.reset(); players = []; scene.setPlayers([]); scene.clearBubbles(); renderPeople(); status('Reconectando…', false); controls(); });
socket.on('connect_error', () => { status('Tentando conectar…', false); controls(); });
socket.on('world:positions', current => { if (joined) { players = current; scene.setPlayers(players); const self = current.find(p => p.id === selfId); if (self) { arcade.update(self); firefly.update(self); } } });
socket.on('player:joined', player => { if (!joined) return; players = [...players.filter(p => p.id !== player.id), player]; scene.setPlayers(players); renderPeople(); toast(`${player.nickname} deu um pulo na praça.`); });
socket.on('player:appearance', (id, appearance) => {
  players = players.map(player => player.id === id ? { ...player, appearance } : player);
  scene.setPlayers(players); renderPeople();
  if (id === selfId && profile) {
    commitAppearance(appearance);
    if (appearanceDialog.open && savingAppearance) { savingAppearance = false; closeAppearance(); }
  }
});
socket.on('player:left', id => { players = players.filter(p => p.id !== id); scene.setPlayers(players); renderPeople(); });
socket.on('chat:message', message => { if (!joined) return; messages.push(message); if (messages.length > 50) messages.shift(); renderMessages(); if (!muted.has(message.playerId)) scene.showBubble(message.playerId, message.text); });
socket.on('game:error', toast);
scene.onMove = point => { if (joined && socket.connected) socket.emit('player:move', point); };
scene.onInvalid = () => toast('Escolha um ponto no caminho ou na grama.');
const input = el<HTMLTextAreaElement>('message-input');
function updateCount() { el('message-count').textContent = `${input.value.length} / 200`; }
input.addEventListener('input', updateCount);
function sendMessage() {
  if (!joined || !socket.connected || sending || !input.value.trim()) return;
  const text = input.value; sending = true; controls();
  socket.timeout(5000).emit('chat:send', text, (error, reply) => {
    sending = false; controls();
    if (error || !reply?.ok) { toast(error ? 'Não foi possível confirmar o envio. Confira o histórico antes de tentar novamente.' : !reply.ok ? reply.error : ''); return; }
    if (input.value === text) input.value = ''; updateCount(); el('messages').scrollTop = el('messages').scrollHeight; input.focus();
  });
}
el('chat-form').addEventListener('submit', event => { event.preventDefault(); sendMessage(); });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage(); } });
document.addEventListener('keydown', event => {
  if (arcade.active || firefly.active || appearanceDialog.open) return;
  if (event.key === 'Enter' && joined && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); openTab(false); input.focus(); }
  if (event.key === 'Escape' && joined) input.blur();
  if (event.key === 'Tab' && !el('entry').hidden) {
    const focusable = Array.from(el('entry').querySelectorAll<HTMLElement>('input, button:not(:disabled)')); const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
document.querySelector('.layout')!.setAttribute('inert', '');
renderMessages(); controls(); el('nickname').focus();
