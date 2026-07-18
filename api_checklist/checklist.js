const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'assessoriampxgrowth-hub';
const REPO  = 'mpx-checklist-data';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

const GH_HEADERS = {
  Authorization:  `token ${GITHUB_TOKEN}`,
  Accept:         'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

// Cache por arquivo — usado APENAS para GETs de polling
const _cache = {};
const CACHE_TTL = 2000; // 2s

// ── Primitivos ────────────────────────────────────────────────────────────────

// Lê um arquivo do repo, retorna { data, sha }
// fresh: true → ignora cache (usado antes de escritas atômicas)
async function ghRead(filename, { fresh = false } = {}) {
  const c = _cache[filename];
  if (!fresh && c && Date.now() - c.time < CACHE_TTL) return { data: c.data, sha: c.sha };

  const res = await fetch(`${API}/${filename}`, { headers: GH_HEADERS });
  if (!res.ok) throw new Error(`ghRead ${filename}: ${res.status}`);

  const json = await res.json();
  // GitHub Contents API retorna o conteúdo em base64
  const data = JSON.parse(Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8'));

  _cache[filename] = { data, sha: json.sha, time: Date.now() };
  return { data, sha: json.sha };
}

// Escreve um arquivo com optimistic locking via SHA
// Retorna { ok: true } se sucesso, { ok: false, conflict: true } se 409 (outro escreveu antes)
async function ghWrite(filename, data, sha) {
  const content = Buffer.from(JSON.stringify(data)).toString('base64');

  const res = await fetch(`${API}/${filename}`, {
    method:  'PUT',
    headers: GH_HEADERS,
    body:    JSON.stringify({ message: `update ${filename}`, content, sha }),
  });

  if (res.status === 409 || res.status === 422) return { ok: false, conflict: true };
  if (!res.ok) throw new Error(`ghWrite ${filename}: ${res.status}`);

  const json = await res.json();
  // Atualiza cache local com o novo SHA retornado pelo GitHub
  _cache[filename] = { data, sha: json.content.sha, time: Date.now() };
  return { ok: true };
}

// ── Operação atômica com retry ────────────────────────────────────────────────
// updateFn: recebe o dado atual (deep clone), retorna o novo dado (ou null = no-op)
// Se outra instância Vercel escreveu antes → GitHub retorna 409 → re-lemos com
// AMBAS as mudanças já mescladas → aplicamos só a nossa → tentamos novamente.
// Isso garante que nenhuma mudança é perdida, mesmo com múltiplos usuários simultâneos.
async function atomicUpdate(filename, updateFn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const { data, sha } = await ghRead(filename, { fresh: true });

    // Passa um deep clone para updateFn não mutar o original
    const updated = updateFn(JSON.parse(JSON.stringify(data)));

    // null = updateFn decidiu que não precisa escrever (ex: LWW impediu o toggle)
    if (updated === null) return data;

    const { ok, conflict } = await ghWrite(filename, updated, sha);

    if (ok) return updated;

    if (!conflict) throw new Error(`ghWrite ${filename} falhou inesperadamente`);

    // 409 → outra instância ganhou a corrida; espera exponencial e tenta de novo
    await new Promise(r => setTimeout(r, 80 * Math.pow(2, i)));
  }

  throw new Error(`atomicUpdate ${filename}: máximo de tentativas excedido`);
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

    // GET — serve estado atual (usa cache 2s para reduzir chamadas à API do GitHub)
    if (req.method === 'GET') {
      const [{ data: d }, { data: p }] = await Promise.all([
        ghRead('data.json'),
        ghRead('presence.json'),
      ]);
      return res.json({ state: d.state, log: d.log, presence: p });
    }

    // POST — ações do time
    if (req.method === 'POST') {
      const body  = req.body;
      const today = new Date().toISOString().slice(0, 10);

      // ── Toggle ────────────────────────────────────────────────────────────
      if (body.action === 'toggle') {
        const { itemId, marcado, user, at } = body;

        const updated = await atomicUpdate('data.json', (d) => {
          const existing   = d.state[itemId];
          const existingAt = existing?.marcado_em || '';

          // Last-Write-Wins: rejeita se o estado remoto (pós-retry) já é mais novo
          if (existingAt && at < existingAt) return null;

          d.state[itemId] = marcado
            ? { marcado: true,  marcado_por: user, marcado_em: at }
            : { marcado: false, marcado_por: null, marcado_em: null };

          const acao = marcado ? 'marcou' : 'desmarcou';
          d.log = [{ itemId, user, acao, at }, ...(d.log || [])].slice(0, 50);
          return d;
        });

        return res.json({ ok: true, data: { state: updated.state, log: updated.log } });

      // ── Reset ─────────────────────────────────────────────────────────────
      } else if (body.action === 'reset') {
        const { ids, group, user, at } = body;

        const updated = await atomicUpdate('data.json', (d) => {
          ids.forEach(id => {
            d.state[id] = { marcado: false, marcado_por: null, marcado_em: null };
          });
          d.log = [{ user, acao: `resetou ${group}`, at }, ...(d.log || [])].slice(0, 50);
          return d;
        });

        return res.json({ ok: true, data: { state: updated.state, log: updated.log } });

      // ── Presence ──────────────────────────────────────────────────────────
      } else if (body.action === 'presence') {
        const { user } = body;

        // Presence usa arquivo separado — nunca toca data.json (state/log intactos)
        const updated = await atomicUpdate('presence.json', (p) => {
          if (!p[today]) p[today] = {};
          p[today][user.toLowerCase()] = Date.now();
          // Limpa dias anteriores
          Object.keys(p).forEach(d => { if (d < today) delete p[d]; });
          return p;
        }, 3); // menos retries para presença — não é crítico

        return res.json({ ok: true, data: { presence: updated } });
      }
    }

  } catch (err) {
    console.error('[checklist]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
