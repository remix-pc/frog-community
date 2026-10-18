import type { MapId } from '../shared/protocol';
import { CINEMA_SCREEN_VIEW } from '../shared/cinema';
import { WORLD } from '../shared/world';

const CHANNEL = 'magunna12022';

export function createTwitchScreen(parent: HTMLElement) {
  const frame = document.createElement('div');
  frame.id = 'twitch-player-frame';
  frame.className = 'twitch-player-frame';
  frame.hidden = true;
  frame.dataset.channel = CHANNEL;

  const player = document.createElement('iframe');
  player.title = `Live da Twitch: ${CHANNEL}`;
  player.allow = 'autoplay; fullscreen; picture-in-picture';
  player.allowFullscreen = true;
  player.loading = 'lazy';
  player.referrerPolicy = 'origin';
  frame.append(player);
  parent.append(frame);

  let mapId: MapId = 'plaza';
  let active = false;
  let observedCanvas: HTMLCanvasElement | null = null;
  let scheduled = false;
  const resize = new ResizeObserver(schedule);
  resize.observe(parent);
  const mutations = new MutationObserver(schedule);
  mutations.observe(parent, { childList: true });
  window.addEventListener('resize', schedule);

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }

  function sync() {
    const canvas = parent.querySelector('canvas');
    if (!canvas) return;
    if (canvas !== observedCanvas) {
      observedCanvas = canvas;
      resize.observe(canvas);
    }

    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const scaleX = canvasRect.width / WORLD.width;
    const scaleY = canvasRect.height / WORLD.height;
    const left = canvasRect.left - parentRect.left + CINEMA_SCREEN_VIEW.x * scaleX;
    const top = canvasRect.top - parentRect.top + CINEMA_SCREEN_VIEW.y * scaleY;
    const width = CINEMA_SCREEN_VIEW.width * scaleX;
    const height = CINEMA_SCREEN_VIEW.height * scaleY;

    frame.style.left = `${left}px`;
    frame.style.top = `${top}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    // Twitch requires the rendered player to be at least 400 × 300 CSS pixels.
    const visible = mapId === 'cinema' && width >= 400 && height >= 300;
    frame.hidden = !visible;

    if (visible && !active) {
      const url = new URL('https://player.twitch.tv/');
      url.searchParams.set('channel', CHANNEL);
      url.searchParams.set('parent', window.location.hostname);
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', 'true');
      player.src = url.toString();
      active = true;
    } else if (!visible && active) {
      player.removeAttribute('src');
      active = false;
    }
  }

  return {
    setMap(next: MapId) {
      mapId = next;
      schedule();
    }
  };
}
