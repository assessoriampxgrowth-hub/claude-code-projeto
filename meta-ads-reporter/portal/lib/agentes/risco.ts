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
type MensagemEvo = {
  key?: { fromMe?: boolean };
  messageTimestamp?: number | string;
};

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

async function ultimasMensagens(remoteJid: string): Promise<MensagemEvo[]> {
  const data = await evoFetch<{ messages?: { records?: MensagemEvo[] } } | MensagemEvo[]>(
    `/chat/findMessages/${EVO_INSTANCE}`,
    { where: { key: { remoteJid } }, limit: 25 }
  );
  if (Array.isArray(data)) return data;
  return data.messages?.records ?? [];
}

function diasDesde(tsSegundos: number, agora: Date): number {
  return Math.floor((agora.getTime() / 1000 - tsSegundos) / 86400);
}

export async function buscarTermometro(agora = new Date()): Promise<ResultadoRisco> {
  const grupos = await evoFetch<Grupo[]>(
    `/group/fetchAllGroups/${EVO_INSTANCE}?getParticipants=false`
  );

  // Grupos de cliente: "MPX - <nome>". Se houver grupo duplicado pro mesmo
  // cliente, fica o com atividade mais recente.
  const alvos: { cliente: string; grupo: Grupo }[] = [];
  for (const g of grupos) {
    const subject = g.subject ?? "";
    if (!/^mpx\s*-/i.test(subject.trim())) continue;
    const nomeGrupo = normalizar(subject.replace(/^mpx\s*-\s*/i, ""));
    const cliente = CLIENTES_MONITORADOS.find((c) => {
      const n = normalizar(c);
      return nomeGrupo.includes(n) || n.includes(nomeGrupo);
    });
    if (cliente) alvos.push({ cliente, grupo: g });
  }

  const porCliente = new Map<string, TermometroGrupo>();
  const lote = 8;
  for (let i = 0; i < alvos.length; i += lote) {
    const resultados = await Promise.all(
      alvos.slice(i, i + lote).map(async ({ cliente, grupo }) => {
        let msgs: MensagemEvo[] = [];
        try {
          msgs = await ultimasMensagens(grupo.id);
        } catch {
          // Grupo ilegível não derruba o termômetro dos demais.
        }
        const ts = (m: MensagemEvo) => Number(m.messageTimestamp ?? 0);
        const ordenadas = msgs.filter((m) => ts(m) > 0).sort((a, b) => ts(b) - ts(a));
        const ultima = ordenadas[0];
        const ultimaNossa = ordenadas.find((m) => m.key?.fromMe);
        const diasSemMensagem = ultima ? diasDesde(ts(ultima), agora) : null;
        const diasSemNossaMensagem = ultimaNossa ? diasDesde(ts(ultimaNossa), agora) : null;
        // Classifica só pela atividade geral do grupo: o histórico da instância
        // começa em 03/07/2026 e o time responde de números próprios, então
        // fromMe não representa "resposta da MPX". null = nada desde o início
        // do histórico (= frio).
        const dias = diasSemMensagem ?? 99;
        const nivel: TermometroGrupo["nivel"] = dias >= 5 ? "frio" : dias >= 3 ? "morno" : "ok";
        return { cliente, grupo: grupo.subject, diasSemMensagem, diasSemNossaMensagem, nivel };
      })
    );
    for (const r of resultados) {
      const atual = porCliente.get(r.cliente);
      if (!atual || (r.diasSemMensagem ?? 99) < (atual.diasSemMensagem ?? 99)) {
        porCliente.set(r.cliente, r);
      }
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
