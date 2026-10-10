import { BENCHES, POND, ROCKS, SIGN, TREES } from '../shared/world';
import { DEFAULT_APPEARANCE, type Appearance } from '../shared/protocol';
const svg = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
// Phaser's SVG loader decodes base64 as a binary string. XML entities preserve accents
// through that path as well as through a regular HTML image element.
export const dataSvg = (source: string) => `data:image/svg+xml;base64,${btoa(source.replace(/[^\x00-\x7f]/gu, character => `&#${character.codePointAt(0)};`))}`;
function outfitArt(id: Appearance['outfit']): string {
  switch (id) {
    case 'tshirt': return `<path d="M36 63l-10 7 8 11 7-5v17q19 10 38 0V76l7 5 8-11-10-7-8 5H44Z" fill="#e7a36f" stroke="#294737" stroke-width="3" stroke-linejoin="round"/><path d="M51 64q9 10 18 0" fill="none" stroke="#fff4d4" stroke-width="4"/>`;
    case 'hoodie': return `<path d="M42 59q18-10 36 0l9 10-6 27q-21 10-42 0l-6-27Z" fill="#8d91bd" stroke="#294737" stroke-width="3"/><path d="M44 62q16 18 32 0M49 82h22v10H49z" fill="none" stroke="#d9d9ed" stroke-width="3"/><path d="M56 68v10m8-10v10" stroke="#fff8e5" stroke-width="2"/>`;
    case 'jacket': return `<path d="M38 60l17-4 5 16 5-16 17 4 7 34q-13 10-28 4l-1-20-1 20q-15 6-28-4Z" fill="#c9a264" stroke="#294737" stroke-width="3" stroke-linejoin="round"/><path d="M52 59l8 16 8-16M60 76v21M40 82h12m16 0h12" fill="none" stroke="#7a6047" stroke-width="2.5"/><circle cx="65" cy="84" r="2" fill="#fff0c2"/>`;
    case 'cape': return `<path d="M39 59Q22 68 18 96Q60 111 102 96Q98 68 81 59l-21 8Z" fill="#d68185" stroke="#294737" stroke-width="3" stroke-linejoin="round"/><path d="M43 65q17 13 34 0" fill="none" stroke="#f6d1ad" stroke-width="4"/><circle cx="60" cy="68" r="4" fill="#edc47a" stroke="#294737" stroke-width="2"/>`;
    default: return '';
  }
}
function glassesArt(id: Appearance['glasses']): string {
  switch (id) {
    case 'round': return `<g fill="none" stroke="#533e54" stroke-width="3.5"><circle cx="40" cy="33" r="13"/><circle cx="80" cy="33" r="13"/><path d="M53 31q7-5 14 0M27 31l-7-3m73 3 7-3"/></g>`;
    case 'sunglasses': return `<path d="M25 25h29l-3 19q-12 8-22-2Zm41 0h29l-4 17q-10 10-22 2Z" fill="#344f52" stroke="#253d40" stroke-width="3" stroke-linejoin="round"/><path d="M54 29q6-5 12 0M30 28l-9-3m69 3 9-3" fill="none" stroke="#253d40" stroke-width="3"/><path d="M31 29h13m27 0h13" stroke="#c3dfd4" stroke-width="2" opacity=".55"/>`;
    case 'square': return `<g fill="none" stroke="#bd795b" stroke-width="3.5" stroke-linejoin="round"><rect x="26" y="22" width="28" height="23" rx="5"/><rect x="66" y="22" width="28" height="23" rx="5"/><path d="M54 30q6-4 12 0M26 27l-7-3m75 3 7-3"/></g>`;
    case 'heart': return `<g fill="#eea7b3" fill-opacity=".32" stroke="#a85d75" stroke-width="3" stroke-linejoin="round"><path d="M40 45Q17 31 29 23q7-5 11 2 7-9 14-2 10 10-14 22Z"/><path d="M80 45Q57 31 69 23q7-5 11 2 7-9 14-2 10 10-14 22Z"/></g><path d="M54 29q6-4 12 0" fill="none" stroke="#a85d75" stroke-width="3"/>`;
    default: return '';
  }
}
function hatArt(id: Appearance['hat']): string {
  switch (id) {
    case 'cap': return `<path d="M30 20Q32 1 59 3q24 0 31 17Z" fill="#e49c6d" stroke="#294737" stroke-width="3"/><path d="M61 18q23-6 41 2-4 8-30 8H53" fill="#c47a58" stroke="#294737" stroke-width="3"/><path d="M39 15q14-8 29-6" fill="none" stroke="#ffd9a1" stroke-width="2"/>`;
    case 'bucket': return `<path d="M35 5h50l8 22H27Z" fill="#edcf83" stroke="#294737" stroke-width="3" stroke-linejoin="round"/><path d="M24 25q36-11 72 0l5 6q-41 12-82 0Z" fill="#d5b36d" stroke="#294737" stroke-width="3"/><path d="M34 18h52" stroke="#fff0b7" stroke-width="3"/>`;
    case 'tophat': return `<path d="M41-4h38l4 28H37Z" fill="#4d5965" stroke="#294737" stroke-width="3"/><path d="M39 17h43v7H39Z" fill="#b17a9b"/><path d="M27 25h66q7 0 7 5H20q0-5 7-5Z" fill="#4d5965" stroke="#294737" stroke-width="3"/>`;
    case 'crown': return `<path d="M29 23L25 2l19 12L59-4l16 18L95 2l-4 21Z" fill="#e9c45e" stroke="#294737" stroke-width="3" stroke-linejoin="round"/><path d="M30 22h60v8H30Z" fill="#d9a84e" stroke="#294737" stroke-width="3"/><circle cx="60" cy="19" r="4" fill="#c77f87"/><circle cx="42" cy="21" r="3" fill="#86aeaa"/><circle cx="78" cy="21" r="3" fill="#86aeaa"/>`;
    default: return '';
  }
}
export const outfitSvg = (id: NonNullable<Appearance['outfit']>) => svg(120, 110, outfitArt(id));
export const glassesSvg = (id: NonNullable<Appearance['glasses']>) => svg(120, 110, glassesArt(id));
export const hatSvg = (id: NonNullable<Appearance['hat']>) => svg(120, 110, hatArt(id));
export function frogSvg(color: string, appearance: Appearance = DEFAULT_APPEARANCE): string {
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
    </g>${outfitArt(appearance.outfit)}${glassesArt(appearance.glasses)}${hatArt(appearance.hat)}`);
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
export function arcadeSvg(): string {
  return svg(120, 170, `<ellipse cx="60" cy="157" rx="55" ry="11" fill="#456a44" opacity=".22"/>
    <g stroke="#365b44" stroke-width="3" stroke-linejoin="round">
      <path d="M18 12H94L106 35V145L93 157H22L14 146V101L24 77Z" fill="#75995e"/>
      <path d="M94 12L106 35V145L93 157V99L83 78Z" fill="#547a4e"/>
      <path d="M18 12H94L91 39H20Z" fill="#f3d884"/>
      <path d="M26 46H84L80 91H23Z" fill="#d0dbae"/>
      <path d="M32 51H78L75 83H30Z" fill="#294b44"/>
      <path d="M23 91H80L94 108H15Z" fill="#c4d695"/>
      <path d="M15 108H94L93 153H22Z" fill="#8ead6d"/>
      <path d="M39 100V89" stroke="#365b44"/><circle cx="39" cy="88" r="5" fill="#e5a265"/>
      <ellipse cx="65" cy="99" rx="5" ry="3" fill="#f3d884"/><ellipse cx="79" cy="101" rx="5" ry="3" fill="#d9898b"/>
      <rect x="46" y="119" width="21" height="13" rx="3" fill="#365b44"/>
      <path d="M52 125H61" stroke="#f3d884"/>
    </g>
    <text x="56" y="25" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="9" font-weight="bold" fill="#365b44">PULO DO SAPO</text>
    <text x="56" y="35" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="6" fill="#547a4e">FLIPERAMA DO BREJO</text>
    <ellipse cx="53" cy="76" rx="15" ry="4" fill="#80b85c"/>
    <path d="M43 70Q40 58 48 60Q53 55 58 60Q66 58 63 70Z" fill="#c4d695"/>
    <circle cx="48" cy="62" r="2" fill="#fffbea"/><circle cx="58" cy="62" r="2" fill="#fffbea"/>`);
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
