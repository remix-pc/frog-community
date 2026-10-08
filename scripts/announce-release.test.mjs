import assert from 'node:assert/strict';
import { test } from 'node:test';
import { announceRelease, buildMessages } from './announce-release.mjs';

const release = {
  name: 'Novidades da praça',
  tag_name: 'v1.1.0',
  html_url: 'https://github.com/remix-pc/frog-community/releases/tag/v1.1.0',
  body: 'Novo mapa e correções no chat.',
};
const event = { action: 'published', release };
const webhook = 'https://discord.com/api/webhooks/123/abc';

test('envia uma Release estável com notas e sem menções', async () => {
  const requests = [];
  const count = await announceRelease(event, webhook, async (url, options) => {
    requests.push({ url: String(url), ...options });
    return { ok: true };
  });
  assert.equal(count, 1);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /wait=true/);
  const payload = JSON.parse(requests[0].body);
  assert.match(payload.content, /v1\.1\.0/);
  assert.match(payload.content, /Novo mapa e correções no chat/);
  assert.match(payload.content, /\[🔗 Ver atualização completa\]\(https:\/\/github\.com\/remix-pc\/frog-community\/releases\/tag\/v1\.1\.0\)/);
  assert.doesNotMatch(payload.content, /\nhttps:\/\/github\.com/);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.equal(payload.flags, 4);
});

test('ignora pré-lançamento', async () => {
  const count = await announceRelease({ ...event, release: { ...release, prerelease: true } }, webhook, () => {
    throw new Error('Não deveria enviar');
  });
  assert.equal(count, 0);
});

test('Release sem descrição informa ausência de notas', () => {
  const [message] = buildMessages({ ...release, body: '  ' });
  assert.match(message, /não tem notas de atualização/);
  assert.match(message, /\[🔗 Ver atualização completa\]/);
});

test('notas longas são divididas sem perda de conteúdo', () => {
  const body = 'Linha de atualização.\n'.repeat(500);
  const messages = buildMessages({ ...release, body });
  assert.ok(messages.length > 1);
  assert.ok(messages.every((message) => message.length <= 2000));
  const header = `# 🐸 Frog Community\n## ${release.name}\n\n**Versão:** \`${release.tag_name}\`\n\n### 📋 Notas da atualização\n`;
  const continuation = '# 🐸 Frog Community\n### 📋 Notas da atualização — continuação\n';
  const footer = `\n\n---\n[🔗 Ver atualização completa](${release.html_url})`;
  const reconstructed = messages.map((message, index) => message.slice(index ? continuation.length : header.length, -footer.length)).join('');
  assert.equal(reconstructed, body);
});

test('divide texto com emojis sem ultrapassar o limite do Discord', () => {
  const body = '🐸'.repeat(2500);
  const messages = buildMessages({ ...release, body });
  assert.ok(messages.length > 1);
  assert.ok(messages.every((message) => message.length <= 2000));
  const header = `# 🐸 Frog Community\n## ${release.name}\n\n**Versão:** \`${release.tag_name}\`\n\n### 📋 Notas da atualização\n`;
  const continuation = '# 🐸 Frog Community\n### 📋 Notas da atualização — continuação\n';
  const footer = `\n\n---\n[🔗 Ver atualização completa](${release.html_url})`;
  assert.equal(messages.map((message, index) => message.slice(index ? continuation.length : header.length, -footer.length)).join(''), body);
});

test('falha quando o Discord rejeita a mensagem', async () => {
  await assert.rejects(
    announceRelease(event, webhook, async () => ({ ok: false, status: 401 })),
    /HTTP 401/,
  );
});
