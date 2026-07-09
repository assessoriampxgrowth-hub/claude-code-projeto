// Agente Relatório de Criativos: 2x por semana (seg e qui), um mini-relatório
// por cliente — leads, CTR, investimento, melhores criativos e ativos vs
// pausados — formatado pra ser encaminhado direto no grupo do cliente.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/security/crypto";

const BASE = "https://graph.facebook.com/v19.0";

const ACTIONS_LEAD = new Set([
  "lead",
  "fb_pixel_lead",
  "leadgen_grouped",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.messaging_conversation_started_7d",
]);

type AdInsight = {
  ad_name?: string;
  spend?: string;
  ctr?: string;
  impressions?: string;
  actions?: { action_type: string; value: string }[];
};

export type RelatorioCliente = {
  cliente: string;
  ok: boolean;
  erro?: string;
  mensagem?: string; // pronta pra encaminhar
  gasto7d?: number;
};

function leads(a: AdInsight): number {
  return (a.actions ?? [])
    .filter((x) => ACTIONS_LEAD.has(x.action_type))
    .reduce((s, x) => s + Number(x.value || 0), 0);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

async function graph<T>(path: string, token: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}/${path}${sep}access_token=${encodeURIComponent(token)}`, {
    next: { revalidate: 0 },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json?.error?.message as string) ?? `Meta API ${res.status}`);
  return json as T;
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
  const periodo = `${inicio.getDate().toString().padStart(2, "0")}/${(inicio.getMonth() + 1)
    .toString()
    .padStart(2, "0")} a ${fim.getDate().toString().padStart(2, "0")}/${(fim.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;

  try {
    const insightsParams = new URLSearchParams({
      level: "ad",
      time_range: JSON.stringify({ since: fmt(inicio), until: fmt(fim) }),
      fields: "ad_name,spend,ctr,impressions,actions",
      limit: "100",
    });
    const [insights, ads] = await Promise.all([
      graph<{ data: AdInsight[] }>(`${accountId}/insights?${insightsParams}`, token),
      graph<{ data: { effective_status: string }[] }>(
        `${accountId}/ads?fields=effective_status&limit=200`,
        token
      ),
    ]);

    const linhas = insights.data ?? [];
    const gasto = linhas.reduce((s, a) => s + Number(a.spend || 0), 0);
    if (gasto === 0) return { cliente, ok: true, gasto7d: 0 };

    const totalLeads = linhas.reduce((s, a) => s + leads(a), 0);
    const impress = linhas.reduce((s, a) => s + Number(a.impressions || 0), 0);
    const ctrMedio =
      linhas.length > 0
        ? linhas.reduce((s, a) => s + Number(a.ctr || 0) * Number(a.impressions || 0), 0) /
          Math.max(impress, 1)
        : 0;

    const ativos = (ads.data ?? []).filter((a) => a.effective_status === "ACTIVE").length;
    const pausados = (ads.data ?? []).length - ativos;

    const top = [...linhas]
      .sort((a, b) => leads(b) - leads(a) || Number(b.ctr || 0) - Number(a.ctr || 0))
      .slice(0, 3)
      .filter((a) => Number(a.spend || 0) > 0);

    const topLinhas = top.map((a, i) => {
      const l = leads(a);
      const resultado = l > 0 ? `${l} leads` : `CTR ${Number(a.ctr || 0).toFixed(2)}%`;
      return `${i + 1}º ${a.ad_name ?? "criativo"} — ${resultado}`;
    });

    const mensagem =
      `📊 *Relatório de campanhas — ${cliente}*\n` +
      `🗓️ Período: ${periodo}\n\n` +
      `👥 Leads gerados: *${totalLeads}*\n` +
      `💰 Investimento: ${brl(gasto)}\n` +
      (totalLeads > 0 ? `🎯 Custo por lead: ${brl(gasto / totalLeads)}\n` : "") +
      `📈 CTR médio: ${ctrMedio.toFixed(2)}%\n` +
      `▶️ Criativos ativos: ${ativos} | ⏸️ Pausados: ${pausados}\n` +
      (topLinhas.length ? `\n🏆 *Melhores criativos:*\n${topLinhas.join("\n")}\n` : "") +
      `\n_Equipe MPX Multiplica_`;

    return { cliente, ok: true, mensagem, gasto7d: gasto };
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
