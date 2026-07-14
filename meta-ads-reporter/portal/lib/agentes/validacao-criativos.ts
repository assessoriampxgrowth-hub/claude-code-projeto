// AGENTE DE VALIDAÇÃO DE CRIATIVOS (spec do Matheus, 14/07/2026).
// Roda mensalmente por cliente: analisa os criativos do mês, classifica
// (🟢 validado / 🟡 promissor / 🔴 não validado / ⚫ descartado) cruzando
// performance de mídia + benchmark do SEGMENTO + sinal comercial.
//
// REGRA CENTRAL: nunca validar criativo só por CPL baixo. Segmento e ticket
// médio mudam o que é "caro". Sem dado de venda, escrever explicitamente
// "venda não registrada no período" — nunca inventar.
//
// Camada comercial: venda/agendamento/feedback não são automáticos (o
// WhatsApp dos clientes não está na API oficial, então não dá pra capturar o
// ctwa_clid que liga a conversa ao criativo). O time informa via
// FEEDBACK_COMERCIAL; sem isso, o agente marca como não informado.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/security/crypto";

const BASE = "https://graph.facebook.com/v19.0";

const ACTIONS_CONVERSA = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "lead",
  "fb_pixel_lead",
  "leadgen_grouped",
  "onsite_conversion.lead_grouped",
]);

// ── Segmentos e benchmark de CPL (tabela do Matheus) ──────────────────────
export type Segmento =
  | "alimentacao"
  | "moda_varejo"
  | "otica_servicos"
  | "educacao_academia"
  | "veiculos"
  | "b2b_industria";

const BENCHMARK: Record<Segmento, { min: number; max: number; rotulo: string }> = {
  alimentacao: { min: 1, max: 4, rotulo: "Pizzaria/Restaurante" },
  moda_varejo: { min: 2, max: 6, rotulo: "Moda/Varejo local" },
  otica_servicos: { min: 3, max: 10, rotulo: "Ótica/Serviços locais" },
  educacao_academia: { min: 5, max: 15, rotulo: "Academia/Escola/Curso" },
  veiculos: { min: 10, max: 30, rotulo: "Veículos/Alto ticket" },
  b2b_industria: { min: 15, max: 50, rotulo: "B2B/Indústria/Alto ticket" },
};

// Mapa cliente -> segmento. Nome casado por trecho (case/acento-insensível).
const SEGMENTO_CLIENTE: Record<string, Segmento> = {
  "hulligel": "alimentacao", "dom caetano": "alimentacao", "centro oeste": "alimentacao",
  "mayara": "alimentacao", "tribos": "alimentacao", "esquina do pao": "alimentacao",
  "pastelaria": "alimentacao", "dicasa": "alimentacao",
  "amalle": "moda_varejo", "toda chic": "moda_varejo", "outlet": "moda_varejo",
  "dino store": "moda_varejo", "elite": "moda_varejo", "chique maria": "moda_varejo",
  "nutri": "moda_varejo", "abel": "educacao_academia",
  "otica": "otica_servicos", "luxell": "otica_servicos", "suzy": "otica_servicos",
  "zezinho": "otica_servicos", "revest": "otica_servicos", "jf higien": "otica_servicos",
  "ana karoline": "otica_servicos", "ernandes": "otica_servicos",
  "ms marmoraria": "otica_servicos", "hermes": "otica_servicos",
  "despachante": "otica_servicos", "terere": "moda_varejo",
  "ativitta": "educacao_academia", "ct es": "educacao_academia",
  "lc motors": "veiculos", "moto pneus": "veiculos",
  "pavimold": "b2b_industria", "agri": "b2b_industria", "starten": "b2b_industria",
  "n laser": "moda_varejo", "nlaser": "moda_varejo",
};

// Feedback comercial informado pelo time (preencher quando houver).
// chave: "cliente::nome do criativo" (minúsculo) -> o que aconteceu comercialmente.
export const FEEDBACK_COMERCIAL: Record<string, { vendas?: number; agendamentos?: number; nota?: string }> = {};

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function segmentoDoCliente(nome: string): Segmento {
  const n = norm(nome);
  for (const [chave, seg] of Object.entries(SEGMENTO_CLIENTE)) {
    if (n.includes(norm(chave))) return seg;
  }
  return "otica_servicos"; // padrão conservador pra serviço local
}

// ── Tipos ─────────────────────────────────────────────────────────────────
export type Classificacao = "validado" | "promissor" | "nao_validado" | "descartado";

type AdInsight = {
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  adset_name?: string;
  objective?: string;
  spend?: string;
  reach?: string;
  impressions?: string;
  frequency?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: { action_type: string; value: string }[];
};

export type CriativoAnalisado = {
  cliente: string;
  campanha: string;
  conjunto: string;
  criativo: string;
  status: string;
  investimento: number;
  alcance: number;
  impressoes: number;
  frequencia: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversas: number;
  cpl: number | null;
  vendas: number | null;
  agendamentos: number | null;
  feedbackComercial: string;
  link: string;
  classificacao: Classificacao;
  motivo: string;
  proximaAcao: string;
};

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

function conversasDe(a: AdInsight): number {
  return (a.actions ?? [])
    .filter((x) => ACTIONS_CONVERSA.has(x.action_type))
    .reduce((s, x) => s + Number(x.value || 0), 0);
}

// Campanha de captação (mensagem/lead). Alcance, tráfego e engajamento puro
// NÃO entram no cálculo de CPL — regra explícita do Matheus.
function ehCaptacao(a: AdInsight): boolean {
  const nome = norm(a.campaign_name ?? "");
  if (/contrata[çc][ãa]o/.test(nome)) return false;
  if (/alcance|seguidores|trafego|tr[áa]fego/.test(nome)) return false;
  return conversasDe(a) > 0 || /MESSAGES|LEAD/i.test(a.objective ?? "");
}

// ── Classificação ─────────────────────────────────────────────────────────
function classificar(
  c: Omit<CriativoAnalisado, "classificacao" | "motivo" | "proximaAcao">,
  seg: Segmento
): { classificacao: Classificacao; motivo: string; proximaAcao: string } {
  const bench = BENCHMARK[seg];
  const temSinalComercial = (c.vendas ?? 0) > 0 || (c.agendamentos ?? 0) > 0;
  const verbaRelevante = c.investimento >= 20; // abaixo disso não deu pra testar
  const ctrOk = c.ctr >= 1.0;
  const cplDentro = c.cpl !== null && c.cpl <= bench.max;
  const cplOtimo = c.cpl !== null && c.cpl <= bench.min * 1.5;

  // ⚫ Descartado: não entregou o suficiente pra ser avaliado.
  if (!verbaRelevante || c.impressoes < 1000) {
    return {
      classificacao: "descartado",
      motivo: `Entrega baixa (${brl(c.investimento)}, ${c.impressoes} impressões) — não dá pra concluir nada.`,
      proximaAcao: "Não reinvestir sem antes revisar formato/segmentação.",
    };
  }

  // 🔴 Não validado: queimou verba sem resultado.
  if (c.conversas === 0) {
    return {
      classificacao: "nao_validado",
      motivo: `Gastou ${brl(c.investimento)} e não gerou nenhuma conversa.`,
      proximaAcao: "Pausar. Refazer gancho e oferta antes de qualquer novo teste.",
    };
  }
  if (c.cpl !== null && c.cpl > bench.max && !temSinalComercial) {
    return {
      classificacao: "nao_validado",
      motivo: `CPL ${brl(c.cpl)} acima da faixa do segmento (${bench.rotulo}: ${brl(bench.min)}–${brl(bench.max)}) e sem venda/agendamento registrado.`,
      proximaAcao: "Pausar e realocar verba pros criativos validados.",
    };
  }
  if (c.ctr < 0.7 && !temSinalComercial) {
    return {
      classificacao: "nao_validado",
      motivo: `CTR ${c.ctr.toFixed(2)}% muito baixo — o criativo não está parando o scroll.`,
      proximaAcao: "Pausar. Testar o mesmo gancho em vídeo.",
    };
  }

  // 🟢 Validado: mídia boa + (sinal comercial OU volume relevante com CPL ótimo).
  const volumeRelevante = c.conversas >= 8;
  if (temSinalComercial && cplDentro) {
    return {
      classificacao: "validado",
      motivo: `Gerou resultado comercial real (${c.vendas ?? 0} venda(s), ${c.agendamentos ?? 0} agendamento(s)) com CPL ${brl(c.cpl!)} dentro da faixa do segmento.`,
      proximaAcao: "Escalar verba e criar variações mantendo o mesmo gancho e oferta.",
    };
  }
  if (cplOtimo && ctrOk && volumeRelevante) {
    return {
      classificacao: "validado",
      motivo: `CPL ${brl(c.cpl!)} bem abaixo da faixa, CTR ${c.ctr.toFixed(2)}% saudável e volume consistente (${c.conversas} conversas).`,
      proximaAcao: "Escalar e gerar variações. Confirmar com o comercial se os leads estão fechando.",
    };
  }

  // 🟡 Promissor: sinal bom, falta confirmação.
  if (cplDentro || ctrOk) {
    const pendencia =
      c.feedbackComercial === "feedback comercial não informado"
        ? "Falta confirmação comercial (o time ainda não informou se esses leads fecharam)."
        : "Precisa de mais volume pra confirmar.";
    return {
      classificacao: "promissor",
      motivo: `CPL ${c.cpl !== null ? brl(c.cpl) : "n/d"} e CTR ${c.ctr.toFixed(2)}% dentro do aceitável. ${pendencia}`,
      proximaAcao: "Manter rodando com verba controlada e cobrar feedback comercial do cliente.",
    };
  }

  return {
    classificacao: "nao_validado",
    motivo: `Performance abaixo do esperado pro segmento (${bench.rotulo}).`,
    proximaAcao: "Pausar e priorizar os criativos validados.",
  };
}

// ── Coleta ────────────────────────────────────────────────────────────────
async function graphAll<T>(path: string, token: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  let url: string | null = `${BASE}/${path}${sep}access_token=${encodeURIComponent(token)}`;
  const tudo: T[] = [];
  let p = 0;
  while (url && p < 20) {
    const res: Response = await fetch(url, { next: { revalidate: 0 } });
    const json = await res.json();
    if (!res.ok) throw new Error((json?.error?.message as string) ?? `Meta API ${res.status}`);
    tudo.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
    p++;
  }
  return tudo;
}

export type ResultadoCliente = {
  cliente: string;
  segmento: Segmento;
  ok: boolean;
  erro?: string;
  criativos: CriativoAnalisado[];
  investimentoTotal: number;
  conversasTotal: number;
  cplMedio: number | null;
};

async function analisarCliente(
  cliente: string,
  accountId: string,
  encToken: string,
  dias = 30
): Promise<ResultadoCliente> {
  const seg = segmentoDoCliente(cliente);
  const vazio = { cliente, segmento: seg, criativos: [], investimentoTotal: 0, conversasTotal: 0, cplMedio: null };

  let token: string;
  try {
    token = decrypt(encToken);
  } catch {
    return { ...vazio, ok: false, erro: "token ilegível" };
  }

  const fim = new Date();
  fim.setDate(fim.getDate() - 1);
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - (dias - 1));
  const f = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const params = new URLSearchParams({
      level: "ad",
      time_range: JSON.stringify({ since: f(inicio), until: f(fim) }),
      fields:
        "ad_id,ad_name,campaign_name,adset_name,objective,spend,reach,impressions,frequency,ctr,cpc,cpm,actions",
      limit: "200",
    });
    const [insights, adsMeta] = await Promise.all([
      graphAll<AdInsight>(`${accountId}/insights?${params}`, token),
      graphAll<{ id: string; effective_status?: string; preview_shareable_link?: string }>(
        `${accountId}/ads?fields=id,effective_status,preview_shareable_link&limit=300`,
        token
      ),
    ]);

    const meta = new Map(adsMeta.map((a) => [a.id, a]));
    const captacao = insights.filter((a) => Number(a.spend || 0) > 0 && ehCaptacao(a));

    const criativos: CriativoAnalisado[] = captacao.map((a) => {
      const conversas = conversasDe(a);
      const investimento = Number(a.spend || 0);
      const m = meta.get(a.ad_id ?? "");
      const fb = FEEDBACK_COMERCIAL[`${norm(cliente)}::${norm(a.ad_name ?? "")}`];

      const base = {
        cliente,
        campanha: a.campaign_name ?? "?",
        conjunto: a.adset_name ?? "?",
        criativo: a.ad_name ?? "?",
        status: m?.effective_status ?? "?",
        investimento,
        alcance: Number(a.reach || 0),
        impressoes: Number(a.impressions || 0),
        frequencia: Number(a.frequency || 0),
        ctr: Number(a.ctr || 0),
        cpc: Number(a.cpc || 0),
        cpm: Number(a.cpm || 0),
        conversas,
        cpl: conversas > 0 ? investimento / conversas : null,
        vendas: fb?.vendas ?? null,
        agendamentos: fb?.agendamentos ?? null,
        feedbackComercial: fb?.nota ?? "feedback comercial não informado",
        link: m?.preview_shareable_link ?? "link não disponível",
      };
      return { ...base, ...classificar(base, seg) };
    });

    const investimentoTotal = criativos.reduce((s, c) => s + c.investimento, 0);
    const conversasTotal = criativos.reduce((s, c) => s + c.conversas, 0);
    return {
      cliente,
      segmento: seg,
      ok: true,
      criativos,
      investimentoTotal,
      conversasTotal,
      cplMedio: conversasTotal > 0 ? investimentoTotal / conversasTotal : null,
    };
  } catch (err: unknown) {
    return { ...vazio, ok: false, erro: err instanceof Error ? err.message.slice(0, 70) : String(err) };
  }
}

export async function validarCriativosDeTodos(dias = 30): Promise<ResultadoCliente[]> {
  const clients = await db.client.findMany({
    where: { active: true },
    include: { adAccounts: { where: { active: true } } },
  });
  const alvos = clients.flatMap((c) =>
    c.adAccounts.map((a) => ({ cliente: c.name, accountId: a.accountId, token: a.accessToken }))
  );

  const out: ResultadoCliente[] = [];
  const lote = 4;
  for (let i = 0; i < alvos.length; i += lote) {
    const parte = await Promise.all(
      alvos.slice(i, i + lote).map((a) => analisarCliente(a.cliente, a.accountId, a.token, dias))
    );
    out.push(...parte);
  }
  return out;
}

// ── Relatório ─────────────────────────────────────────────────────────────
const ICONE: Record<Classificacao, string> = {
  validado: "🟢",
  promissor: "🟡",
  nao_validado: "🔴",
  descartado: "⚫",
};

export function montarRelatorio(r: ResultadoCliente, periodo: string): string | null {
  if (!r.ok || !r.criativos.length) return null;
  const bench = BENCHMARK[r.segmento];

  const val = r.criativos.filter((c) => c.classificacao === "validado");
  const pro = r.criativos.filter((c) => c.classificacao === "promissor");
  const nao = r.criativos.filter((c) => c.classificacao === "nao_validado");
  const des = r.criativos.filter((c) => c.classificacao === "descartado");

  const partes: string[] = [
    `📋 *RELATÓRIO MENSAL DE CRIATIVOS VALIDADOS*\n*${r.cliente}* | ${bench.rotulo} | ${periodo}`,
    `*1. Resumo do mês*\n` +
      `💰 Investimento em captação: ${brl(r.investimentoTotal)}\n` +
      `👥 Leads/conversas: ${r.conversasTotal}\n` +
      `🎯 CPL médio: ${r.cplMedio !== null ? brl(r.cplMedio) : "n/d"} _(faixa do segmento: ${brl(bench.min)}–${brl(bench.max)})_\n` +
      `📦 Criativos analisados: ${r.criativos.length}\n` +
      `🟢 Validados: ${val.length} | 🟡 Promissores: ${pro.length} | 🔴 Não validados: ${nao.length} | ⚫ Descartados: ${des.length}`,
  ];

  const detalhe = (c: CriativoAnalisado) =>
    `${ICONE[c.classificacao]} *${c.criativo}*\n` +
    `  Campanha: ${c.campanha}\n` +
    `  Status: ${c.status} | ${brl(c.investimento)} | ${c.conversas} conversas | CPL ${c.cpl !== null ? brl(c.cpl) : "n/d"}\n` +
    `  CTR ${c.ctr.toFixed(2)}% | CPC ${brl(c.cpc)} | CPM ${brl(c.cpm)} | freq ${c.frequencia.toFixed(1)}\n` +
    `  Venda: ${c.vendas !== null ? c.vendas : "venda não registrada no período"} | Agendamento: ${c.agendamentos !== null ? c.agendamentos : "não registrado"}\n` +
    `  Comercial: ${c.feedbackComercial}\n` +
    `  🔗 ${c.link}\n` +
    `  📌 ${c.motivo}\n` +
    `  ➡️ ${c.proximaAcao}`;

  if (val.length) partes.push(`*2. 🟢 Criativos validados*\n\n${val.map(detalhe).join("\n\n")}`);
  else partes.push(`*2. 🟢 Criativos validados*\nNenhum criativo atingiu validação neste período.`);

  if (pro.length) partes.push(`*3. 🟡 Promissores (manter em teste)*\n\n${pro.map(detalhe).join("\n\n")}`);
  if (nao.length) partes.push(`*4. 🔴 Não validados (pausar)*\n\n${nao.map(detalhe).join("\n\n")}`);
  if (des.length)
    partes.push(
      `*⚫ Descartados (entrega insuficiente):* ${des.map((c) => c.criativo).join(", ")}`
    );

  // 5. Aprendizados — derivados dos dados, sem inventar.
  const porFormato = (chave: RegExp) => {
    const grupo = r.criativos.filter((c) => chave.test(c.criativo));
    const conv = grupo.reduce((s, c) => s + c.conversas, 0);
    const inv = grupo.reduce((s, c) => s + c.investimento, 0);
    return { n: grupo.length, cpl: conv > 0 ? inv / conv : null };
  };
  const video = porFormato(/v[íi]deo|reels/i);
  const imagem = porFormato(/arte|imagem|carrossel/i);
  const melhor = [...r.criativos].filter((c) => c.cpl !== null).sort((a, b) => a.cpl! - b.cpl!)[0];
  const pior = [...r.criativos].filter((c) => c.cpl !== null).sort((a, b) => b.cpl! - a.cpl!)[0];

  const aprendizados: string[] = [];
  if (melhor) aprendizados.push(`• Melhor CPL do mês: *${melhor.criativo}* (${brl(melhor.cpl!)})`);
  if (pior && pior !== melhor) aprendizados.push(`• Pior CPL do mês: *${pior.criativo}* (${brl(pior.cpl!)})`);
  if (video.cpl !== null && imagem.cpl !== null) {
    const vence = video.cpl < imagem.cpl ? "VÍDEO" : "IMAGEM";
    aprendizados.push(
      `• Formato que performou melhor: *${vence}* (vídeo ${brl(video.cpl)} vs imagem ${brl(imagem.cpl)})`
    );
  }
  aprendizados.push(
    r.cplMedio !== null && r.cplMedio <= bench.max
      ? `• CPL médio dentro da faixa do segmento ✅`
      : `• ⚠️ CPL médio ACIMA da faixa do segmento — priorizar realocação de verba`
  );
  partes.push(`*5. Aprendizados do mês*\n${aprendizados.join("\n")}`);

  partes.push(
    `*6. Pendência do time*\nSe algum desses criativos gerou venda ou agendamento, me avisa que eu registro no banco de criativos validados. Sem isso, a classificação fica só pela mídia.`
  );

  return partes.join("\n\n");
}
