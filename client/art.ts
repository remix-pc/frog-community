import { BENCHES, POND, ROCKS, SIGN, TREES } from '../shared/world';
const svg = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
// Phaser's SVG loader decodes base64 as a binary string. XML entities preserve accents
// through that path as well as through a regular HTML image element.
export const dataSvg = (source: string) => `data:image/svg+xml;base64,${btoa(source.replace(/[^\x00-\x7f]/gu, character => `&#${character.codePointAt(0)};`))}`;
export function frogSvg(color: string): string {
  return svg(120, 110, `
    <g stroke="#294737" stroke-width="3.5" stroke-linejoin="round">
      <ellipse cx="30" cy="85" rx="20" ry="12" fill="${color}"/><ellipse cx="90" cy="85" rx="20" ry="12" fill="${color}"/>
      <path d="M27 67C21 38 36 28 60 29S99 39 93 69L97 84Q84 98 60 96Q37 98 23 84Z" fill="${color}"/>
      <ellipse cx="60" cy="77" rx="24" ry="17" fill="#e4e9ac" stroke="none"/>
      <circle cx="39" cy="31" r="19" fill="${color}"/><circle cx="81" cy="31" r="19" fill="${color}"/>
      <ellipse cx="40" cy="31" rx="11" ry="12" fill="#fffbea" stroke="none"/><ellipse cx="80" cy="31" rx="11" ry="12" fill="#fffbea" stroke="none"/>
      <ellipse cx="42" cy="32" rx="5.5" ry="7" fill="#233d31" stroke="none"/><ellipse cx="78" cy="32" rx="5.5" ry="7" fill="#233d31" stroke="none"/>
      <circle cx="44" cy="29" r="2" fill="white" stroke="none"/><circle cx="80" cy="29" r="2" fill="white" stroke="none"/>
      <path d="M44 53Q60 65 76 53" fill="none" stroke-linecap="round"/>
      <ellipse cx="30" cy="51" rx="7" ry="4" fill="#e69c89" stroke="none" opacity=".65"/><ellipse cx="90" cy="51" rx="7" ry="4" fill="#e69c89" stroke="none" opacity=".65"/>
      <path d="M32 69L30 82M88 69L90 82" fill="none" stroke-linecap="round"/>
    </g>`);
}
export function treeSvg(): string {
  return svg(180, 220, `<ellipse cx="90" cy="200" rx="59" ry="15" fill="#456a44" opacity=".18"/>
    <path d="M79 116L75 198Q92 210 107 198L101 112Z" fill="#94734c" stroke="#6c583e" stroke-width="4"/>
    <path d="M92 173L66 143M93 154L117 130" stroke="#6c583e" stroke-width="5" fill="none"/>
    <path d="M33 146C-1 126 10 87 35 75C20 41 56 18 79 30C104-3 147 26 142 53C188 64 180 109 155 122C165 151 119 167 95 151C72 170 47 164 33 146Z" fill="#5c8e56" stroke="#3f7149" stroke-width="4"/>
    <path d="M35 91C29 54 60 42 81 49C98 16 137 43 135 66C162 70 165 97 149 109C121 102 125 121 98 112C76 130 44 122 35 91Z" fill="#80a964"/>
    <path d="M49 78Q50 57 70 58M93 48Q110 34 121 53" fill="none" stroke="#a5c47d" stroke-width="7" stroke-linecap="round"/>
    <circle cx="132" cy="130" r="5" fill="#c1d185"/><circle cx="45" cy="132" r="4" fill="#c1d185"/>`);
}
export function groundSvg(): string {
  let details = '';
  // Deterministic handmade scenery, no external assets or fonts.
  for (let i = 0; i < 165; i++) {
    const x = (i * 173 + 61) % 1190, y = (i * 113 + 35) % 790;
    details += `<path d="M${x} ${y}l-3 -6m3 6l4 -4" stroke="#8bab6b" stroke-width="2" opacity=".38" stroke-linecap="round"/>`;
  }
  for (const [x, y] of [[245, 433], [638, 281], [650, 670], [99, 336], [885, 665], [404, 167], [1090, 540], [407, 704]]) {
    for (let j = 0; j < 5; j++) details += `<g transform="translate(${x + j * 11},${y + (j % 2) * 12})"><path d="M0 0v10" stroke="#729458" stroke-width="2"/><circle r="5" fill="${j % 2 ? '#f5e5a2' : '#fff4db'}"/><circle r="2" fill="#d8ac56"/></g>`;
  }
  const stones = ROCKS.map(r => `<ellipse cx="${r.x}" cy="${r.y + 7}" rx="${r.rx + 7}" ry="${r.ry}" fill="#759065" opacity=".25"/><path d="M${r.x - r.rx} ${r.y}q-2 -${r.ry * 1.6} ${r.rx} -${r.ry * 1.4}q${r.rx} -3 ${r.rx} ${r.ry * 1.4}q-${r.rx} ${r.ry} -${r.rx * 2} 0Z" fill="#a0aaa0" stroke="#7b897f" stroke-width="3"/><path d="M${r.x - r.rx + 11} ${r.y - 9}q12 -17 29 -10" stroke="#c1c6b5" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('');
  const benches = BENCHES.map(b => `<g transform="translate(${b.x},${b.y})"><ellipse cy="12" rx="75" ry="22" fill="#79905e" opacity=".2"/><path d="M-49 -4v22M49 -4v22" stroke="#536451" stroke-width="9"/><rect x="-65" y="-30" width="130" height="15" rx="5" fill="#b58e59" stroke="#856a44" stroke-width="3"/><rect x="-65" y="-10" width="130" height="21" rx="5" fill="#d0ad75" stroke="#856a44" stroke-width="3"/><path d="M-60 0H60" stroke="#b78f58" stroke-width="2"/></g>`).join('');
  return svg(1200, 800, `<defs><radialGradient id="grass"><stop stop-color="#c5dba0"/><stop offset="1" stop-color="#abc889"/></radialGradient><pattern id="grain" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="4" cy="6" r="1" fill="#789958" opacity=".15"/><circle cx="21" cy="20" r="1.2" fill="#f0efb7" opacity=".35"/></pattern><linearGradient id="water" x2="0" y2="1"><stop stop-color="#70bcb2"/><stop offset="1" stop-color="#a0d3b7"/></linearGradient></defs>
    <path fill="url(#grass)" d="M0 0h1200v800H0z"/><path fill="url(#grain)" d="M0 0h1200v800H0z"/>
    <path d="M-80 458Q125 430 322 470T658 456Q705 564 790 631T1204 726M450 840Q535 627 543 477T488 170" fill="none" stroke="#a7b57b" stroke-width="119" opacity=".35"/>
    <path d="M-80 450Q125 422 322 462T658 448Q705 556 790 623T1204 718M450 840Q535 619 543 469T488 162" fill="none" stroke="#e2d6a8" stroke-width="104"/>
    <ellipse cx="547" cy="464" rx="186" ry="134" fill="#e2d6a8"/>
    <ellipse cx="547" cy="464" rx="126" ry="88" fill="none" stroke="#c9be90" stroke-width="2" stroke-dasharray="8 12" opacity=".6"/>
    ${details}
    <ellipse cx="${POND.x}" cy="${POND.y + 7}" rx="${POND.rx + 19}" ry="${POND.ry + 16}" fill="#83a66a"/>
    <ellipse cx="${POND.x}" cy="${POND.y}" rx="${POND.rx + 9}" ry="${POND.ry + 9}" fill="#d0ce99"/>
    <ellipse cx="${POND.x}" cy="${POND.y}" rx="${POND.rx}" ry="${POND.ry}" fill="url(#water)" stroke="#69a694" stroke-width="4"/>
    <path d="M784 254Q799 233 832 226M1054 393Q1079 387 1090 371M768 326q-5 -12 0 -24" fill="none" stroke="#d5edc6" stroke-width="5" stroke-linecap="round" opacity=".65"/>
    ${[[842, 238], [1020, 352], [884, 399], [1080, 271]].map(([x, y], i) => `<g transform="translate(${x},${y}) rotate(${i * 30})"><ellipse cy="5" rx="31" ry="17" fill="#559b80" opacity=".3"/><path d="M0 0l25 -11a30 19 0 1 1 -9 -6Z" fill="#7faa62" stroke="#588b58" stroke-width="2"/><path d="M0 0l-15 8M0 0l-14 -9" stroke="#96be75" stroke-width="2"/>${i % 2 ? '<path d="M-8 -6Q-19 -28 0 -16Q14 -32 14 -9Q24 -9 8 0Q-1 5 -8 -6" fill="#f5c5b2"/><circle cx="4" cy="-7" r="4" fill="#f2da96"/>' : ''}</g>`).join('')}
    ${[[744, 368], [1040, 161], [1142, 331], [820, 447]].map(([x, y]) => `<g transform="translate(${x},${y})"><path d="M0 7L-8 -34M4 8L12 -44M-4 8L-20 -18" stroke="#688d54" stroke-width="4" stroke-linecap="round"/><path d="M12 -43l-1 -14M-8 -33l-4 -12" stroke="#92744c" stroke-width="7" stroke-linecap="round"/></g>`).join('')}
    ${stones}${benches}
    <g transform="translate(${SIGN.x},${SIGN.y})"><path d="M-36 -12v20M36 -12v20" stroke="#876e44" stroke-width="9"/><path d="M-78 -65Q0 -80 78 -65L73 -18Q0 -8 -73 -18Z" fill="#e8d5a1" stroke="#987949" stroke-width="4"/><text x="0" y="-42" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-weight="bold" font-size="17" fill="#546c45">PRAÇA DO BREJO</text><path d="M-25 -28H25" stroke="#b5a274" stroke-width="2"/></g>
    <g opacity=".22" fill="#638f50">${TREES.map(t => `<ellipse cx="${t.x + 20}" cy="${t.y + 5}" rx="${70 * t.scale}" ry="${25 * t.scale}"/>`).join('')}</g>`);
}
