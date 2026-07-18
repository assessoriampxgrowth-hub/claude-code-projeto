// VIGIA DE ENTREGA — o assassino silencioso da agência é o anúncio reprovado.
// A Meta rejeita o criativo, a entrega para, o cliente segue pagando o fee e
// ninguém percebe até ele reclamar. O agente de saldo vê se a CONTA está viva
// e quantas CAMPANHAS estão ativas; ninguém olhava o ANÚNCIO.
//
// Checa por conta de cliente ativo:
//   1. anúncios DISAPPROVED (reprovados) — com o motivo que a Meta deu
//   2. anúncios WITH_ISSUES (rodando com problema)
//   3. anúncios travados em PENDING_REVIEW há mais de 24h
//   4. campanha ATIVA sem nenhum anúncio entregando (dinheiro parado)

import { db } from "@/lib/db";
import { decrypt } from "@/lib/security/crypto";

const BASE = "https://graph.facebook.com/v19.0";

type Pagina<T> = { data?: T[]; paging?: { next?: string } };

// Percorre todas as páginas — meia-verdade de paginação já nos custou caro antes.
async function graphAll<T>(path: string, token: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  let url = `${BASE}/${path}${sep}access_token=${encodeURIComponent(token)}`;
  const out: T[] = [];
  for (let i = 0; i < 20 && url; i++) {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json = (await res.json()) as Pagina<T> & { error?: { message?: string } };
    if (!res.ok) throw new Error(json?.error?.message ?? `Meta API ${res.status}`);
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? "";
  }
  return out;
}

type IssueInfo = { error_summary?: string; error_message?: string; level?: string };

type AdBruto = {
  id: string;
  name?: string;
  effective_status?: string;
  created_time?: string;
  issues_info?: IssueInfo[];
  campaign?: { name?: string };
};

export type AnuncioProblema = {
  anuncio: string;
  campanha: string;
  motivo: string;
};

export type EntregaCliente = {
  cliente: string;
  conta: string;
  status: "critico" | "atencao" | "ok" | "sem_acesso";
  reprovados: AnuncioProblema[];
  comProblema: AnuncioProblema[];
  emAnalise: AnuncioProblema[];
  campanhasVazias: string[]; // campanha ativa sem anúncio entregando
  erro?: string;
};

// A Meta manda o motivo em issues_info; sem ele, sobra o status cru.
function motivoDe(ad: AdBruto): string {
  const issue = ad.issues_info?.[0];
  const texto = issue?.error_summary ?? issue?.error_message ?? "";
  return texto ? texto.slice(0, 120) : "sem detalhe da Meta";
}

function paraProblema(ad: AdBruto): AnuncioProblema {
  return {
    anuncio: ad.name?.slice(0, 60) ?? ad.id,
    campanha: ad.campaign?.name?.slice(0, 50) ?? "—",
    motivo: motivoDe(ad),
  };
}

async function checarConta(
  cliente: string,
  accountId: string,
  encryptedToken: string
): Promise<EntregaCliente> {
  const vazio = { reprovados: [], comProblema: [], emAnalise: [], campanhasVazias: [] };

  let token: string;
  try {
    token = decrypt(encryptedToken);
  } catch {
    return { cliente, conta: accountId, status: "sem_acesso", erro: "token ilegível", ...vazio };
  }

  let ads: AdBruto[];
  try {
    ads = await graphAll<AdBruto>(
      `${accountId}/ads?fields=id,name,effective_status,created_time,issues_info,campaign{name}&limit=200`,
      token
    );
  } catch (err: unknown) {
    return {
      cliente,
      conta: accountId,
      status: "sem_acesso",
      erro: err instanceof Error ? err.message.slice(0, 80) : String(err),
      ...vazio,
    };
  }

  const reprovados: AnuncioProblema[] = [];
  const comProblema: AnuncioProblema[] = [];
  const emAnalise: AnuncioProblema[] = [];
  const ativosPorCampanha = new Map<string, number>();

  const ontem = Date.now() - 24 * 3600 * 1000;

  for (const ad of ads) {
    const status = ad.effective_status ?? "";
    const campanha = ad.campaign?.name ?? "—";

    if (status === "ACTIVE") {
      ativosPorCampanha.set(campanha, (ativosPorCampanha.get(campanha) ?? 0) + 1);
      continue;
    }
    if (status === "DISAPPROVED") reprovados.push(paraProblema(ad));
    else if (status === "WITH_ISSUES") comProblema.push(paraProblema(ad));
    else if (status === "PENDING_REVIEW") {
      // Análise normal leva minutos. Passou de 24h, travou.
      const criado = ad.created_time ? new Date(ad.created_time).getTime() : Date.now();
      if (criado < ontem) emAnalise.push(paraProblema(ad));
    }
  }

  // Campanha ligada sem nenhum anúncio entregando = verba parada sem ninguém ver.
  let campanhasVazias: string[] = [];
  try {
    const camps = await graphAll<{ name?: string; effective_status?: string }>(
      `${accountId}/campaigns?fields=name,effective_status&limit=200`,
      token
    );
    campanhasVazias = camps
      .filter((c) => c.effective_status === "ACTIVE")
      .map((c) => c.name ?? "—")
      .filter((nome) => !ativosPorCampanha.has(nome));
  } catch {
    // Sem permissão de campanha não invalida a leitura dos anúncios.
  }

  const status: EntregaCliente["status"] =
    reprovados.length || campanhasVazias.length
      ? "critico"
      : comProblema.length || emAnalise.length
        ? "atencao"
        : "ok";

  return {
    cliente,
    conta: accountId,
    status,
    reprovados,
    comProblema,
    emAnalise,
    campanhasVazias,
  };
}

export async function varrerEntrega(): Promise<EntregaCliente[]> {
  const clients = await db.client.findMany({
    where: { active: true },
    include: { adAccounts: { where: { active: true } } },
  });

  const alvos = clients.flatMap((c) =>
    c.adAccounts.map((a) => ({ cliente: c.name, accountId: a.accountId, token: a.accessToken }))
  );

  const resultados: EntregaCliente[] = [];
  const lote = 5;
  for (let i = 0; i < alvos.length; i += lote) {
    const parte = await Promise.all(
      alvos.slice(i, i + lote).map((a) => checarConta(a.cliente, a.accountId, a.token))
    );
    resultados.push(...parte);
  }
  return resultados;
}

export function montarMensagemEntrega(resultados: EntregaCliente[]): string | null {
  const criticos = resultados.filter((r) => r.status === "critico");
  const atencao = resultados.filter((r) => r.status === "atencao");
  const semAcesso = resultados.filter((r) => r.status === "sem_acesso");

  // Dia sem problema nenhum não vira mensagem — senão o time para de ler.
  if (!criticos.length && !atencao.length) return null;

  const partes: string[] = [
    `🚨 *VIGIA DE ENTREGA* — ${resultados.length} contas checadas`,
  ];

  if (criticos.length) {
    const blocos = criticos.map((r) => {
      const linhas: string[] = [`*${r.cliente}*`];
      for (const a of r.reprovados.slice(0, 4)) {
        linhas.push(`  ❌ REPROVADO: ${a.anuncio}\n     _${a.motivo}_`);
      }
      if (r.reprovados.length > 4) linhas.push(`  _+${r.reprovados.length - 4} reprovado(s)_`);
      for (const c of r.campanhasVazias.slice(0, 3)) {
        linhas.push(`  ⚠️ Campanha ATIVA sem anúncio entregando: ${c}`);
      }
      if (r.campanhasVazias.length > 3) {
        linhas.push(`  _+${r.campanhasVazias.length - 3} campanha(s) na mesma situação_`);
      }
      return linhas.join("\n");
    });
    partes.push(`🔴 *PARADO — resolver hoje:*\n\n${blocos.join("\n\n")}`);
  }

  if (atencao.length) {
    const linhas = atencao.map((r) => {
      const marcas: string[] = [];
      if (r.comProblema.length) marcas.push(`${r.comProblema.length} com problema`);
      if (r.emAnalise.length) marcas.push(`${r.emAnalise.length} em análise há +24h`);
      return `• *${r.cliente}* — ${marcas.join(", ")}`;
    });
    partes.push(`🟠 *Atenção:*\n${linhas.join("\n")}`);
  }

  if (semAcesso.length) {
    partes.push(`⚪ Sem acesso: ${semAcesso.length} conta(s).`);
  }

  partes.push(`_Anúncio reprovado = verba parada. Cada dia sem ver é dia de fee sem entrega._`);
  return partes.join("\n\n");
}
