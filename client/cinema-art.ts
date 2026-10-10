import type { Appearance } from '../shared/protocol';
import { CINEMA_SCREEN } from '../shared/cinema';

const svg = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;

export function cinemaGroundSvg() {
  let grass = '';
  for (let i = 0; i < 180; i++) {
    const x = (i * 173 + 61) % 1190, y = (i * 113 + 35) % 790;
    grass += `<path d="M${x} ${y}l-3-6m3 6 4-4" stroke="#719459" stroke-width="2" opacity=".32"/>`;
  }
  return svg(1200, 800, `<defs><radialGradient id="lawn"><stop stop-color="#ccdaa5"/><stop offset="1" stop-color="#94b47b"/></radialGradient></defs>
    <rect width="1200" height="800" fill="url(#lawn)"/>${grass}
    <rect x="374" y="297" width="665" height="368" rx="40" fill="#b7c38b" stroke="#92a771" stroke-width="3"/>
    <path d="M720 810V310M385 315v355h650V315" fill="none" stroke="#e0d3a7" stroke-width="58" stroke-linejoin="round"/>
    <path d="M385 315h650" stroke="#e0d3a7" stroke-width="30"/>
    <path d="M690 730h60m-53-24h46" stroke="#c4b88e" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="720" cy="281" rx="354" ry="20" fill="#456044" opacity=".16"/>
    <g stroke="#685c44" stroke-width="8"><path d="M395 160v120m650-120v120"/></g>
    <g fill="#f4e8b8" stroke="#a4a26c" stroke-width="2">
      ${[380, 490, 600, 840, 950, 1060].map(x => `<circle cx="${x}" cy="690" r="5"/>`).join('')}
    </g>
    <path d="M55 285Q150 325 300 275M1090 300q80 35 130 0" fill="none" stroke="#74875a" stroke-width="3"/>
    ${[80, 130, 180, 230, 280, 1110, 1155].map((x, i) => `<circle cx="${x}" cy="${295 + (i % 3) * 6}" r="6" fill="#f8e8ac" stroke="#bcab76" stroke-width="2"/>`).join('')}
    <text x="180" y="365" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="13" letter-spacing="3" fill="#466747">SOB O CÉU DO BREJO</text>`);
}

export function cinemaScreenSvg() {
  const { width, height } = CINEMA_SCREEN;
  return svg(width, height, `<defs><linearGradient id="screen" x2="0" y2="1"><stop stop-color="#fffbea"/><stop offset="1" stop-color="#e3e8c5"/></linearGradient></defs>
    <rect x="3" y="3" width="684" height="219" rx="12" fill="#476451" stroke="#2e4b3c" stroke-width="6"/>
    <rect x="16" y="15" width="658" height="195" rx="5" fill="url(#screen)"/>
    <path d="M37 39h30m-30 0v25m616-25h-30m30 0v25M37 185h30m-30 0v-25m616 25h-30m30 0v-25" fill="none" stroke="#a6b78a" stroke-width="2"/>
    <g transform="translate(345 55)" fill="#789963"><ellipse cy="11" rx="23" ry="16"/><circle cx="-13" r="10"/><circle cx="13" r="10"/><circle cx="-13" r="3" fill="#f8f5de"/><circle cx="13" r="3" fill="#f8f5de"/><path d="M-8 13q8 7 16 0" stroke="#f8f5de" stroke-width="2" fill="none"/></g>
    <text x="345" y="124" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="39" font-weight="bold" fill="#365941">Cinema do Brejo</text>
    <text x="345" y="159" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" fill="#617a50">Escolha um lugar e fique à vontade</text>
    <text x="345" y="188" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="10" letter-spacing="4" fill="#87956d">BOA COMPANHIA · CÉU ABERTO</text>`);
}

export function cinemaChairSvg(back = false) {
  return svg(80, 76, back
    ? `<g stroke="#66563d" stroke-width="3" stroke-linejoin="round"><path d="M14 46v23m52-23v23"/><rect x="9" y="33" width="62" height="22" rx="5" fill="#bb9060"/><path d="M15 40h50m-50 8h50" stroke="#d7b47c" stroke-width="2"/></g>`
    : `<ellipse cx="40" cy="64" rx="38" ry="10" fill="#456044" opacity=".16"/><g stroke="#66563d" stroke-width="3" stroke-linejoin="round"><path d="M16 20v40m48-40v40"/><path d="M16 15h48l8 24H8Z" fill="#e4c98e"/><path d="M10 24v24m60-24v24M5 23h15m40 0h15" fill="none"/></g>`);
}

// Back-facing layers use the same 120 × 110 coordinate system as the normal frog.
export function seatedFrogSvg(color: string) {
  return svg(120, 110, `<g fill="${color}" stroke="#294737" stroke-width="3.5" stroke-linejoin="round"><ellipse cx="29" cy="88" rx="19" ry="12"/><ellipse cx="91" cy="88" rx="19" ry="12"/><path d="M26 66Q22 34 60 33q38 1 34 33l5 21q-39 25-78 0Z"/><circle cx="39" cy="34" r="18"/><circle cx="81" cy="34" r="18"/></g><path d="M41 57q19-10 38 0" stroke="#e4e9ac" stroke-width="3" opacity=".35" fill="none"/><ellipse cx="60" cy="77" rx="17" ry="13" fill="#294737" opacity=".08"/>`);
}

export function seatedOutfitSvg(id: NonNullable<Appearance['outfit']>) {
  const color = { tshirt: '#e7a36f', hoodie: '#8d91bd', jacket: '#c9a264', cape: '#d68185' }[id];
  return svg(120, 110, `<path d="${id === 'cape' ? 'M37 59Q25 69 18 98q42 15 84 0Q95 69 83 59Z' : 'M35 61q25-11 50 0l9 29q-34 20-68 0Z'}" fill="${color}" stroke="#294737" stroke-width="3"/>
    ${id === 'hoodie' ? '<path d="M41 61q19-14 38 0l-4 17q-15 9-30 0Z" fill="#a7abd0" stroke="#656887" stroke-width="2"/>' : '<path d="M45 63q15 6 30 0" stroke="#fff4d4" opacity=".4" stroke-width="3" fill="none"/>'}`);
}

export function seatedGlassesSvg() {
  return svg(120, 110, '<path d="M21 33l9 6m69-6-9 6" stroke="#533e54" stroke-width="4" stroke-linecap="round"/>');
}

export function seatedCapSvg() {
  return svg(120, 110, '<path d="M30 23Q32 3 60 3q28 0 30 20Z" fill="#e49c6d" stroke="#294737" stroke-width="3"/><path d="M52 22v-6h16v6" fill="#c47a58" stroke="#294737" stroke-width="2"/>');
}
