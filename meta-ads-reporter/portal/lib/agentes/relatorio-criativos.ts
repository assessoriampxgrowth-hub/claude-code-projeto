// Agente Relatório de Criativos (2x/semana, seg e qui) — gera DOIS relatórios
// por cliente (regras do Matheus, 09/07/2026):
// 1. Cliente: curto e comercial — conversas, investimento, custo por conversa,
//    melhor criativo (link curto fb.me), alerta principal e próxima ação.
//    Sem CTR/CPC/CPM/frequência. Seguidores só quando relevante e com
//    linguagem de "crescimento do perfil" (sem atribuição direta).
// 2. Interno MPX: técnico completo — todas as métricas por criativo, links de
//    todos, diagnóstico e ação.
// Cálculo do custo por conversa: APENAS gasto dos anúncios de mensagem ÷
// conversas desses mesmos anúncios — nunca o investimento total da conta.

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

type AdInsight = {
  ad_id?: string;
  ad_name?: string;
  objective?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  impressions?: string;
  actions?: { action_type: string; value: string }[];
};

type AdMeta = { id: string; preview_shareable_link?: string; effective_status?: string };

export type RelatorioCliente = {
  cliente: string;
  ok: boolean;
  erro?: string;
  mensagemCliente?: string;
  mensagemInterna?: string;
  gasto7d?: number;
};

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

function conversas(a: AdInsight): number {
  return (a.actions ?? [])
    .filter((x) => ACTIONS_CONVERSA.has(x.action_type))
    .reduce((s, x) => s + Number(x.value || 0), 0);
}

function seguidores(a: AdInsight): number {
  return (a.actions ?? [])
    .filter((x) => /follow|^like$/.test(x.action_type))
    .reduce((s, x) => s + Number(x.value || 0), 0);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtBr(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function graph<T>(path: string, token: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}/${path}${sep}access_token=${encodeURIComponent(token)}`, {
    next: { revalidate: 0 },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json?.error?.message as string) ?? `Meta API ${res.status}`);
  return json as T;
}

// Alerta principal + próxima ação, em linguagem simples (heurística).
function diagnostico(
  custoPorConversa: number | null,
  totalConversas: number,
  melhor: { nome: string; conversas: number; ativo: boolean } | null,
  ativos: number
): { alerta: string; acao: string } {
  if (ativos === 0) {
    return {
      alerta: "As campanhas estão pausadas no momento — sem anúncios rodando, não entram novas conversas.",
      acao: "Reativar as campanhas (adicionar saldo na conta, se for o caso) para voltar a gerar conversas.",
    };
  }
  if (totalConversas === 0) {
    return {
      alerta: "Os anúncios rodaram, mas não geraram conversas no período.",
      acao: "Trocar os criativos e revisar a oferta anunciada — o time MPX já está preparando novas versões.",
    };
  }
  if (melhor && !melhor.ativo) {
    return {
      alerta: `O anúncio que mais gerou conversas ("${melhor.nome}") está pausado no momento.`,
      acao: "Reativar ou criar uma nova versão do melhor anúncio para aproveitar o que já funciona.",
    };
  }
  if (custoPorConversa !== null && custoPorConversa > 15) {
    return {
      alerta: "O custo por conversa está acima do ideal neste período.",
      acao: "Testar novos criativos e ajustar o público para baixar o custo por conversa.",
    };
  }
  return {
    alerta: "Nenhum ponto crítico — campanhas rodando dentro do esperado.",
    acao: "Manter a estratégia atual e escalar o investimento no melhor anúncio.",
  };
}

async function relatorioDaConta(
  cliente: string,
  accountId: string,
  encryptedToken: string
): Promise<RelatorioCliente> {
  let token: string;
  try {
    token = decrypt(encryptedToken);
  } catch {
    return { cliente, ok: false, erro: "token ilegível" };
  }

  const fim = new Date();
  fim.setDate(fim.getDate() - 1);
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - 6);
  const periodo = `${fmtBr(inicio)} a ${fmtBr(fim)}`;

  try {
    const insightsParams = new URLSearchParams({
      level: "ad",
      time_range: JSON.stringify({ since: fmt(inicio), until: fmt(fim) }),
      fields: "ad_id,ad_name,objective,spend,ctr,cpc,cpm,frequency,impressions,actions",
      limit: "150",
    });
    const [insights, adsMeta] = await Promise.all([
      graph<{ data: AdInsight[] }>(`${accountId}/insights?${insightsParams}`, token),
      graph<{ data: AdMeta[] }>(
        `${accountId}/ads?fields=id,preview_shareable_link,effective_status&limit=300`,
        token
      ),
    ]);

    const linhas = (insights.data ?? []).filter((a) => Number(a.spend || 0) > 0);
    const gastoTotal = linhas.reduce((s, a) => s + Number(a.spend || 0), 0);
    if (gastoTotal === 0) return { cliente, ok: true, gasto7d: 0 };

    const linkPorAd = new Map<string, string>();
    const statusPorAd = new Map<string, string>();
    for (const ad of adsMeta.data ?? []) {
      if (ad.preview_shareable_link) linkPorAd.set(ad.id, ad.preview_shareable_link);
      statusPorAd.set(ad.id, ad.effective_status ?? "");
    }
    const ativos = (adsMeta.data ?? []).filter((a) => a.effective_status === "ACTIVE").length;
    const pausados = (adsMeta.data ?? []).length - ativos;

    // Base do custo por conversa: SÓ anúncios de mensagem (objetivo de
    // mensagens/leads ou que registraram conversa) — nunca a conta inteira.
    const adsConversa = linhas.filter(
      (a) => conversas(a) > 0 || /MESSAGES|LEAD|ENGAGEMENT/i.test(a.objective ?? "")
    );
    const gastoConversa = adsConversa.reduce((s, a) => s + Number(a.spend || 0), 0);
    const totalConversas = adsConversa.reduce((s, a) => s + conversas(a), 0);
    const custoPorConversa = totalConversas > 0 ? gastoConversa / totalConversas : null;

    const totalSeguidores = linhas.reduce((s, a) => s + seguidores(a), 0);

    const rank = [...adsConversa].sort((a, b) => conversas(b) - conversas(a));
    const melhorAd = rank[0] && conversas(rank[0]) > 0 ? rank[0] : null;
    const melhor = melhorAd
      ? {
          nome: melhorAd.ad_name ?? "criativo",
          conversas: conversas(melhorAd),
          custo: Number(melhorAd.spend || 0) / conversas(melhorAd),
          link: linkPorAd.get(melhorAd.ad_id ?? ""),
          ativo: statusPorAd.get(melhorAd.ad_id ?? "") === "ACTIVE",
        }
      : null;

    const { alerta, acao } = diagnostico(custoPorConversa, totalConversas, melhor, ativos);

    // ── Relatório do CLIENTE ────────────────────────────────────────────
    const partesCliente: string[] = [
      `📊 *Relatório de campanhas — ${cliente}*`,
      `🗓️ Período: ${periodo}`,
      `👥 Conversas geradas no WhatsApp: *${totalConversas}*`,
      `💰 Investimento no período: ${brl(gastoConversa)}`,
    ];
    if (custoPorConversa !== null) {
      partesCliente.push(
        `🎯 Custo por conversa no WhatsApp: ${brl(custoPorConversa)}\n_Cada pessoa que chamou no WhatsApp custou em média esse valor._`
      );
    }
    if (melhor) {
      partesCliente.push(
        `🏆 *Melhor criativo:*\n${melhor.nome} — ${melhor.conversas} conversas — ${brl(melhor.custo)} por conversa` +
          (melhor.link ? `\n🔗 Ver criativo: ${melhor.link}` : "")
      );
    }
    // Seguidores: só quando relevante (≥30) e sem atribuição direta.
    if (totalSeguidores >= 30) {
      partesCliente.push(
        `👤 Crescimento do perfil no período: +${totalSeguidores} seguidores\n_Além das conversas no WhatsApp, o perfil também cresceu no período analisado._`
      );
    }
    partesCliente.push(`⚠️ *Atenção:*\n${alerta}`, `✅ *Próxima ação recomendada:*\n${acao}`, `_Equipe MPX Multiplica_`);

    // ── Relatório INTERNO MPX ───────────────────────────────────────────
    const linhasInterno = [...linhas]
      .sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0))
      .map((a) => {
        const c = conversas(a);
        const cpl = c > 0 ? ` | ${brl(Number(a.spend || 0) / c)}/conv` : "";
        const link = linkPorAd.get(a.ad_id ?? "");
        return (
          `• ${a.ad_name ?? "?"} [${statusPorAd.get(a.ad_id ?? "") || "?"}] — ${brl(Number(a.spend || 0))} | ` +
          `${c} conv${cpl} | CTR ${Number(a.ctr || 0).toFixed(2)}% | CPC ${brl(Number(a.cpc || 0))} | ` +
          `CPM ${brl(Number(a.cpm || 0))} | freq ${Number(a.frequency || 0).toFixed(1)}` +
          (link ? `\n  ${link}` : "")
        );
      });

    const mensagemInterna =
      `🔒 *INTERNO MPX — ${cliente}* (${periodo})\n` +
      `Gasto total conta: ${brl(gastoTotal)} | Base conversas: ${brl(gastoConversa)} | ` +
      `${totalConversas} conversas${custoPorConversa !== null ? ` | ${brl(custoPorConversa)}/conv` : ""} | ` +
      `Seguidores/likes: +${totalSeguidores}\n` +
      `▶️ ${ativos} ativos | ⏸️ ${pausados} pausados\n\n` +
      `${linhasInterno.join("\n")}\n\n` +
      `🩺 Diagnóstico: ${alerta}\n➡️ Ação: ${acao}`;

    return {
      cliente,
      ok: true,
      mensagemCliente: partesCliente.join("\n\n"),
      mensagemInterna,
      gasto7d: gastoTotal,
    };
  } catch (err: unknown) {
    return { cliente, ok: false, erro: err instanceof Error ? err.message.slice(0, 70) : String(err) };
  }
}

export async function gerarRelatorios(): Promise<RelatorioCliente[]> {
  const clients = await db.client.findMany({
    where: { active: true },
    include: { adAccounts: { where: { active: true } } },
  });
  const alvos = clients.flatMap((c) =>
    c.adAccounts.map((a) => ({ cliente: c.name, accountId: a.accountId, token: a.accessToken }))
  );

  const resultados: RelatorioCliente[] = [];
  const lote = 5;
  for (let i = 0; i < alvos.length; i += lote) {
    const parte = await Promise.all(
      alvos.slice(i, i + lote).map((a) => relatorioDaConta(a.cliente, a.accountId, a.token))
    );
    resultados.push(...parte);
  }
  return resultados;
}
