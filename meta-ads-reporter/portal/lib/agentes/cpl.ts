// Agente CPL: custo por lead de cada cliente — ontem, média 7 dias e pior
// dia da janela. Roda diariamente; leads = lead + fb_pixel_lead + conversa
// iniciada no WhatsApp (padrão das campanhas CTWA da MPX).

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

export type CplCliente = {
  cliente: string;
  ok: boolean;
  erro?: string;
  leads7d?: number;
  gasto7d?: number;
  cplOntem?: number | null;
  cpl7d?: number | null;
  cplPiorDia?: { data: string; cpl: number } | null;
};

type DiaInsight = {
  date_start: string;
  spend?: string;
  actions?: { action_type: string; value: string }[];
};

function leadsDoDia(d: DiaInsight): number {
  return (d.actions ?? [])
    .filter((a) => ACTIONS_LEAD.has(a.action_type))
    .reduce((s, a) => s + Number(a.value || 0), 0);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function cplDaConta(cliente: string, accountId: string, encryptedToken: string): Promise<CplCliente> {
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

  const params = new URLSearchParams({
    level: "account",
    time_increment: "1",
    time_range: JSON.stringify({ since: fmt(inicio), until: fmt(fim) }),
    fields: "spend,actions",
    access_token: token,
  });

  let dias: DiaInsight[];
  try {
    const res = await fetch(`${BASE}/${accountId}/insights?${params}`, { next: { revalidate: 0 } });
    const json = await res.json();
    if (!res.ok) throw new Error((json?.error?.message as string) ?? `Meta API ${res.status}`);
    dias = json.data ?? [];
  } catch (err: unknown) {
    return { cliente, ok: false, erro: err instanceof Error ? err.message.slice(0, 70) : String(err) };
  }

  const gasto7d = dias.reduce((s, d) => s + Number(d.spend || 0), 0);
  const leads7d = dias.reduce((s, d) => s + leadsDoDia(d), 0);
  const ontem = dias.find((d) => d.date_start === fmt(fim));
  const leadsOntem = ontem ? leadsDoDia(ontem) : 0;
  const gastoOntem = ontem ? Number(ontem.spend || 0) : 0;

  let piorDia: { data: string; cpl: number } | null = null;
  for (const d of dias) {
    const l = leadsDoDia(d);
    const g = Number(d.spend || 0);
    if (l > 0 && g > 0) {
      const cpl = g / l;
      if (!piorDia || cpl > piorDia.cpl) {
        piorDia = { data: d.date_start.slice(8, 10) + "/" + d.date_start.slice(5, 7), cpl };
      }
    }
  }

  return {
    cliente,
    ok: true,
    leads7d,
    gasto7d,
    cplOntem: leadsOntem > 0 ? gastoOntem / leadsOntem : gastoOntem > 0 ? null : 0,
    cpl7d: leads7d > 0 ? gasto7d / leads7d : null,
    cplPiorDia: piorDia,
  };
}

export async function varrerCpl(): Promise<CplCliente[]> {
  const clients = await db.client.findMany({
    where: { active: true },
    include: { adAccounts: { where: { active: true } } },
  });
  const alvos = clients.flatMap((c) =>
    c.adAccounts.map((a) => ({ cliente: c.name, accountId: a.accountId, token: a.accessToken }))
  );

  const resultados: CplCliente[] = [];
  const lote = 5;
  for (let i = 0; i < alvos.length; i += lote) {
    const parte = await Promise.all(
      alvos.slice(i, i + lote).map((a) => cplDaConta(a.cliente, a.accountId, a.token))
    );
    resultados.push(...parte);
  }
  return resultados;
}

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

export function montarMensagemCpl(resultados: CplCliente[]): string {
  const comDados = resultados.filter((r) => r.ok && (r.gasto7d ?? 0) > 0);
  const semAcesso = resultados.filter((r) => !r.ok).length;

  const partes: string[] = [`🎯 *CPL diário* — ${comDados.length} conta(s) com movimento nos últimos 7 dias`];

  if (comDados.length) {
    const linhas = comDados
      .sort((a, b) => (b.gasto7d ?? 0) - (a.gasto7d ?? 0))
      .map((r) => {
        const ontem =
          r.cplOntem === 0 ? "sem gasto ontem" : r.cplOntem === null ? "⚠️ gastou sem lead ontem" : `ontem ${brl(r.cplOntem)}`;
        const media = r.cpl7d === null ? "sem lead na semana ⚠️" : `7d ${brl(r.cpl7d)}`;
        const pior = r.cplPiorDia ? ` | pior dia ${r.cplPiorDia.data}: ${brl(r.cplPiorDia.cpl)}` : "";
        return `• *${r.cliente}* — ${ontem} | ${media}${pior} | ${r.leads7d} leads / ${brl(r.gasto7d ?? 0)}`;
      });
    partes.push(linhas.join("\n"));
  } else {
    partes.push("Nenhuma conta acessível com gasto na janela.");
  }

  if (semAcesso) partes.push(`⚪ Sem acesso (aguardando token novo do Meta): ${semAcesso} conta(s).`);
  return partes.join("\n\n");
}
