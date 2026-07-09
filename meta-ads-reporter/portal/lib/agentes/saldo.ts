// Agente de Saldo/Contas: varre diariamente a conta Meta Ads de cada cliente
// ativo e reporta saldo restante, pagamento recusado, conta bloqueada e
// campanhas ativas/paradas. WhatsApp = alerta rápido; detalhe fica no
// Gerenciador de Anúncios.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/security/crypto";

const BASE = "https://graph.facebook.com/v19.0";

// account_status da Meta (principais).
const STATUS_CONTA: Record<number, string> = {
  1: "ativa",
  2: "desativada",
  3: "pagamento pendente/recusado",
  7: "em análise de risco",
  9: "em período de carência",
  100: "pendente de fechamento",
  101: "fechada",
};

export type SaldoCliente = {
  cliente: string;
  conta: string;
  status: "critico" | "atencao" | "ok" | "sem_acesso";
  problema?: string;
  saldoDisplay?: string;
  campanhasAtivas?: number;
  campanhasPausadas?: number;
};

type ContaMeta = {
  name?: string;
  account_status?: number;
  disable_reason?: number;
  balance?: string; // centavos gastos ainda não cobrados (pós-pago)
  currency?: string;
  funding_source_details?: { display_string?: string; type?: number };
};

async function graph<T>(path: string, token: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}/${path}${sep}access_token=${encodeURIComponent(token)}`, {
    next: { revalidate: 0 },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json?.error?.message as string) ?? `Meta API ${res.status}`);
  return json as T;
}

// Extrai um valor numérico de "R$ 123,45" / "$123.45" quando possível.
function parseValor(display: string): number | null {
  const m = display.replace(/\./g, "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

async function checarConta(
  cliente: string,
  accountId: string,
  encryptedToken: string
): Promise<SaldoCliente> {
  let token: string;
  try {
    token = decrypt(encryptedToken);
  } catch {
    return { cliente, conta: accountId, status: "sem_acesso", problema: "token ilegível" };
  }

  let conta: ContaMeta;
  try {
    conta = await graph<ContaMeta>(
      `${accountId}?fields=name,account_status,disable_reason,balance,currency,funding_source_details`,
      token
    );
  } catch (err: unknown) {
    return {
      cliente,
      conta: accountId,
      status: "sem_acesso",
      problema: err instanceof Error ? err.message.slice(0, 80) : String(err),
    };
  }

  let ativas = 0;
  let pausadas = 0;
  try {
    const camps = await graph<{ data: { effective_status: string }[] }>(
      `${accountId}/campaigns?fields=effective_status&limit=200`,
      token
    );
    for (const c of camps.data ?? []) {
      if (c.effective_status === "ACTIVE") ativas++;
      else pausadas++;
    }
  } catch {
    // Sem permissão de campanha não invalida a leitura da conta.
  }

  const saldoDisplay = conta.funding_source_details?.display_string;
  const statusConta = conta.account_status ?? 1;

  // Crítico: conta fora do ar (bloqueio, pagamento recusado, desativada).
  if (statusConta !== 1) {
    return {
      cliente,
      conta: conta.name ?? accountId,
      status: "critico",
      problema: `conta ${STATUS_CONTA[statusConta] ?? `status ${statusConta}`}`,
      saldoDisplay,
      campanhasAtivas: ativas,
      campanhasPausadas: pausadas,
    };
  }

  // Crítico: cliente ativo sem NENHUMA campanha rodando.
  if (ativas === 0) {
    return {
      cliente,
      conta: conta.name ?? accountId,
      status: "critico",
      problema: "nenhuma campanha rodando",
      saldoDisplay,
      campanhasAtivas: ativas,
      campanhasPausadas: pausadas,
    };
  }

  // Atenção: saldo pré-pago baixo (menos de ~3 dias do mínimo de R$30/dia).
  if (saldoDisplay) {
    const valor = parseValor(saldoDisplay);
    if (valor !== null && valor < 90) {
      return {
        cliente,
        conta: conta.name ?? accountId,
        status: "atencao",
        problema: `saldo baixo (${saldoDisplay})`,
        saldoDisplay,
        campanhasAtivas: ativas,
        campanhasPausadas: pausadas,
      };
    }
  }

  return {
    cliente,
    conta: conta.name ?? accountId,
    status: "ok",
    saldoDisplay,
    campanhasAtivas: ativas,
    campanhasPausadas: pausadas,
  };
}

export async function varrerSaldos(): Promise<SaldoCliente[]> {
  const clients = await db.client.findMany({
    where: { active: true },
    include: { adAccounts: { where: { active: true } } },
  });

  const resultados: SaldoCliente[] = [];
  const lote = 5;
  const alvos = clients.flatMap((c) =>
    c.adAccounts.map((a) => ({
      cliente: c.name,
      accountId: a.accountId,
      token: a.accessToken,
    }))
  );

  for (let i = 0; i < alvos.length; i += lote) {
    const parte = await Promise.all(
      alvos.slice(i, i + lote).map((a) => checarConta(a.cliente, a.accountId, a.token))
    );
    resultados.push(...parte);
  }
  return resultados;
}

export function montarMensagemSaldo(resultados: SaldoCliente[]): string {
  const criticos = resultados.filter((r) => r.status === "critico");
  const atencao = resultados.filter((r) => r.status === "atencao");
  const ok = resultados.filter((r) => r.status === "ok");
  const semAcesso = resultados.filter((r) => r.status === "sem_acesso");

  const partes: string[] = [`💳 *Vigia de Saldo Meta Ads* — ${resultados.length} contas checadas`];

  if (criticos.length) {
    partes.push(
      `🔴 *Crítico — agir hoje:*\n` +
        criticos
          .map((r) => {
            const extra = r.saldoDisplay ? ` | ${r.saldoDisplay}` : "";
            return `• *${r.cliente}* — ${r.problema}${extra}`;
          })
          .join("\n")
    );
  }

  if (atencao.length) {
    partes.push(
      `🟠 *Saldo acabando:*\n` +
        atencao.map((r) => `• *${r.cliente}* — ${r.problema}`).join("\n")
    );
  }

  if (ok.length) {
    const linhas = ok.map((r) => {
      const saldo = r.saldoDisplay ? ` | ${r.saldoDisplay}` : "";
      return `• ${r.cliente}: ${r.campanhasAtivas} ativa(s)${saldo}`;
    });
    partes.push(`🟢 *Rodando normal:*\n${linhas.join("\n")}`);
  }

  if (semAcesso.length) {
    partes.push(
      `⚪ Sem acesso à conta (aguardando token novo do Meta): ${semAcesso.length} cliente(s).`
    );
  }

  if (!criticos.length && !atencao.length && ok.length) {
    partes.push(`Nenhum alerta de saldo hoje. ✅`);
  }

  return partes.join("\n\n");
}
