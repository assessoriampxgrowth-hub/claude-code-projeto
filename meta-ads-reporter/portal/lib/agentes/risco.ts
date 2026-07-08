// Agente Risco/Retenção: termômetro dos grupos de WhatsApp dos clientes.
// Grupo esfriando (dias sem mensagem, ou sem resposta nossa) é o primeiro
// sinal de churn — mesma análise feita manualmente em abr/2026, agora
// automática e semanal via Evolution API.

const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

// Clientes ativos a monitorar — casa com o nome do grupo "MPX - <nome>"
// (comparação sem acento/caixa). Manter alinhado com a carteira ativa.
const CLIENTES_MONITORADOS = [
  "Amalle Calçados", "Restaurante Centro Oeste", "Ortobom", "Nutri Mais",
  "Abel", "Pavimold", "Revest Envelopamentos", "Agri Manutenção", "Dicasa",
  "Pizzaria Hulligel", "Moto Pneus", "Outlet Modas", "Dino Store",
  "Suzy Cabelereira", "Zezinho Ar", "Toda Chic", "Restaurante Mayara",
  "NLaser", "Ana Karoline", "Lc Motors", "Dom Caetano", "Ernandes Mecânica",
  "Tereré", "Alves Tec", "Malice", "Hermes Tec", "Ótica Luxell",
  "Pizzaria Fiori", "Ms Marmoraria", "Academia Ativittá",
  "Despachante Mineiros", "Starten Centro de Negócios", "CT ES Team",
  "Mult Profissões", "Panificadora Esquina do Pão",
];

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type Grupo = { id: string; subject: string };

export type TermometroGrupo = {
  cliente: string;
  grupo: string;
  diasSemMensagem: number | null; // null = nenhuma mensagem encontrada
  diasSemNossaMensagem: number | null;
  nivel: "frio" | "morno" | "ok";
};

export type ResultadoRisco = {
  grupos: TermometroGrupo[];
  clientesSemGrupo: string[];
};

async function evoFetch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${EVO_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: { apikey: EVO_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function diasDesde(tsSegundos: number, agora: Date): number {
  return Math.floor((agora.getTime() / 1000 - tsSegundos) / 86400);
}

type ChatEvo = {
  remoteJid?: string;
  lastMessage?: { messageTimestamp?: number | string };
};

export async function buscarTermometro(agora = new Date()): Promise<ResultadoRisco> {
  // Duas chamadas só: roster completo de grupos + última mensagem de cada chat.
  // (findMessages por grupo estourava o tempo limite da função na Vercel.)
  const [grupos, chats] = await Promise.all([
    evoFetch<Grupo[]>(`/group/fetchAllGroups/${EVO_INSTANCE}?getParticipants=false`),
    evoFetch<ChatEvo[]>(`/chat/findChats/${EVO_INSTANCE}`, {}),
  ]);

  const ultimaPorJid = new Map<string, number>();
  for (const c of chats) {
    const ts = Number(c.lastMessage?.messageTimestamp ?? 0);
    if (c.remoteJid && ts > 0) {
      ultimaPorJid.set(c.remoteJid, Math.max(ts, ultimaPorJid.get(c.remoteJid) ?? 0));
    }
  }

  // Grupos de cliente: "MPX - <nome>". Se houver grupo duplicado pro mesmo
  // cliente, fica o com atividade mais recente.
  const porCliente = new Map<string, TermometroGrupo>();
  for (const g of grupos) {
    const subject = g.subject ?? "";
    if (!/^mpx\s*-/i.test(subject.trim())) continue;
    const nomeGrupo = normalizar(subject.replace(/^mpx\s*-\s*/i, ""));
    const cliente = CLIENTES_MONITORADOS.find((c) => {
      const n = normalizar(c);
      return nomeGrupo.includes(n) || n.includes(nomeGrupo);
    });
    if (!cliente) continue;

    const ts = ultimaPorJid.get(g.id);
    // Sem mensagem registrada = nada desde o início do histórico (03/07/2026) = frio.
    const diasSemMensagem = ts ? diasDesde(ts, agora) : null;
    const dias = diasSemMensagem ?? 99;
    const nivel: TermometroGrupo["nivel"] = dias >= 5 ? "frio" : dias >= 3 ? "morno" : "ok";
    const item: TermometroGrupo = {
      cliente,
      grupo: subject,
      diasSemMensagem,
      diasSemNossaMensagem: null,
      nivel,
    };

    const atual = porCliente.get(cliente);
    if (!atual || (item.diasSemMensagem ?? 99) < (atual.diasSemMensagem ?? 99)) {
      porCliente.set(cliente, item);
    }
  }

  const monitorados = Array.from(porCliente.values());
  const clientesSemGrupo = CLIENTES_MONITORADOS.filter((c) => !porCliente.has(c));
  return { grupos: monitorados, clientesSemGrupo };
}

export function montarMensagemRisco(resultado: ResultadoRisco): string {
  const frios = resultado.grupos.filter((g) => g.nivel === "frio");
  const mornos = resultado.grupos.filter((g) => g.nivel === "morno");
  const ok = resultado.grupos.filter((g) => g.nivel === "ok");

  const linha = (g: TermometroGrupo) => {
    const msg =
      g.diasSemMensagem === null
        ? "nenhuma mensagem no grupo desde 03/07"
        : `${g.diasSemMensagem} dia(s) sem mensagem no grupo`;
    return `• *${g.cliente}* — ${msg}`;
  };

  const blocos: string[] = [`🌡️ *Termômetro dos grupos de clientes* — ${resultado.grupos.length} monitorados`];
  if (frios.length) {
    blocos.push(`🔴 *Frios (risco de churn)* — agir essa semana:\n${frios.map(linha).join("\n")}`);
  }
  if (mornos.length) {
    blocos.push(`🟡 *Esfriando:*\n${mornos.map(linha).join("\n")}`);
  }
  blocos.push(`🟢 Ativos: ${ok.length} grupos com movimento nos últimos 2 dias.`);
  if (resultado.clientesSemGrupo.length) {
    blocos.push(`⚠️ Sem grupo encontrado no WhatsApp: ${resultado.clientesSemGrupo.join(", ")}`);
  }
  if (!frios.length && !mornos.length) {
    blocos.push("Nenhum grupo esfriando. Carteira aquecida. 👏");
  }
  return blocos.join("\n\n");
}
