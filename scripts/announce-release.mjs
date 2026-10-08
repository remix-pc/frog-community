import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DISCORD_LIMIT = 2000;
const SITE_URL = 'https://frog-community.onrender.com/';

function splitText(text, limit) {
  const chunks = [];
  const characters = Array.from(text);
  let start = 0;

  while (start < characters.length) {
    let end = start;
    let length = 0;
    let lastNewline = -1;
    while (end < characters.length && length + characters[end].length <= limit) {
      length += characters[end].length;
      if (characters[end] === '\n') lastNewline = end + 1;
      end += 1;
    }
    if (end === start) throw new Error('Um caractere das notas excede o limite do Discord.');
    const cut = lastNewline > start + (end - start) / 2 ? lastNewline : end;
    chunks.push(characters.slice(start, cut).join(''));
    start = cut;
  }

  return chunks;
}

export function buildMessages(release) {
  const title = Array.from(String(release.name || '').trim() || 'Nova atualização').slice(0, 200).join('');
  const tag = Array.from(String(release.tag_name || '').trim()).slice(0, 100).join('');
  const url = String(release.html_url || '').trim();
  if (!tag || !url) throw new Error('A Release precisa de tag_name e html_url.');

  const header = `# 🐸 Frog Community\n## ${title}\n\n**Versão:** \`${tag}\`\n\n### 📋 Notas da atualização\n`;
  const continuation = `# 🐸 Frog Community\n### 📋 Notas da atualização — continuação\n`;
  const footer = `\n\n---\n[🌐 Jogar agora](${SITE_URL}) • [🔗 Ver atualização completa](${url})`;
  const body = String(release.body || '');
  const notes = body.trim() ? body : '_Esta versão não tem notas de atualização._';
  const firstLimit = DISCORD_LIMIT - header.length - footer.length;
  if (firstLimit < 1) throw new Error('O cabeçalho da Release excede o limite do Discord.');

  const [first, ...rest] = splitText(notes, firstLimit);
  const laterLimit = DISCORD_LIMIT - continuation.length - footer.length;
  if (laterLimit < 1) throw new Error('A tag da Release excede o limite do Discord.');

  return [
    header + first + footer,
    ...rest.flatMap((part) => splitText(part, laterLimit).map((chunk) => continuation + chunk + footer)),
  ];
}

export async function announceRelease(event, webhookUrl, fetchImpl = fetch) {
  if (event.action !== 'published' || event.release?.draft || event.release?.prerelease) return 0;
  if (!event.release) throw new Error('Evento sem dados da Release.');
  if (!webhookUrl) throw new Error('Configure o secret DISCORD_WEBHOOK_URL no repositório.');

  const messages = buildMessages(event.release);
  const endpoint = new URL(webhookUrl);
  endpoint.searchParams.set('wait', 'true');

  for (const content of messages) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        allowed_mentions: { parse: [] },
        flags: 4,
      }),
    });
    if (!response.ok) throw new Error(`Discord recusou o aviso (HTTP ${response.status}).`);
  }

  return messages.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH não definido.');
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const count = await announceRelease(event, process.env.DISCORD_WEBHOOK_URL);
    console.log(count ? `${count} mensagem(ns) enviada(s) ao Discord.` : 'Release ignorada.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
