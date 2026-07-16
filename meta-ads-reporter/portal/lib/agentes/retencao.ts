// AGENTE CS / RAIO-X DE RETENÇÃO — consolida os sinais de risco que hoje
// estão espalhados em 3 agentes (grupo frio, saldo/campanha, pagamento) numa
// única nota de saúde por cliente, ranqueada, com ação recomendada.
// Churn é o que mata agência: melhor ver o risco cedo, num lugar só.

import { buscarTermometro } from "./risco";
import { varrerSaldos } from "./saldo";
import { carregarCarteira } from "./cobranca-clientes";

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Casa nomes de clientes vindos de fontes diferentes (planilha, grupo, conta).
function mesmoCliente(a: string, b: string): boolean {
  const na = norm(a).replace(/[^a-z0-9]/g, "");
  const nb = norm(b).replace(/[^a-z0-9]/g, "");
  if (!na || !nb) return false;
  return na.includes(nb.slice(0, 8)) || nb.includes(na.slice(0, 8));
}

export type SaudeCliente = {
  cliente: string;
  score: number; // 0 (crítico) a 100 (saudável)
  sinais: string[];
  acao: string;
};

// Penalidades por sinal de risco (quanto maior, pior).
const P = {
  devendo: 40,
  grupoFrio: 25,
  grupoMorno: 12,
  contaCritica: 30, // pagamento recusado / conta desativada
  semCampanha: 25,
  saldoBaixo: 12,
  semDiaPgto: 8,
};

export type ResultadoRetencao = {
  clientes: SaudeCliente[];
  gerado: string;
};

export async function raioXRetencao(): Promise<ResultadoRetencao> {
  // 3 varreduras em paralelo — cada uma já é resiliente a falha isolada.
  const [termometro, saldos, carteira] = await Promise.all([
    buscarTermometro().catch(() => ({ grupos: [], clientesSemGrupo: [] })),
    varrerSaldos().catch(() => []),
    carregarCarteira().catch(() => ({ carteira: [], devedores: [], ativosSemDia: [], fonte: "reserva" as const })),
  ]);

  // Universo = ativos da planilha (carteira com dia + ativos sem dia) + devedores.
  const nomes = new Set<string>();
  for (const c of carteira.carteira) nomes.add(c.nome);
  for (const n of carteira.ativosSemDia) nomes.add(n);
  for (const d of carteira.devedores) nomes.add(d.nome);

  const clientes: SaudeCliente[] = [];
  for (const nome of nomes) {
    let score = 100;
    const sinais: string[] = [];
    let acao = "Manter acompanhamento normal.";

    // 1) Pagamento
    const devendo = carteira.devedores.find((d) => mesmoCliente(d.nome, nome));
    if (devendo) {
      score -= P.devendo;
      sinais.push("🔴 devendo");
      acao = "Cobrar o pagamento em aberto ainda esta semana.";
    }
    if (carteira.ativosSemDia.some((n) => mesmoCliente(n, nome))) {
      score -= P.semDiaPgto;
      sinais.push("⚪ sem dia de pagamento na planilha");
    }

    // 2) Grupo (termômetro de atividade)
    const g = termometro.grupos.find((x) => mesmoCliente(x.cliente, nome));
    if (g?.nivel === "frio") {
      score -= P.grupoFrio;
      sinais.push("🥶 grupo frio (sem conversa)");
      if (!devendo) acao = "Grupo esfriando — mandar atualização/contato proativo.";
    } else if (g?.nivel === "morno") {
      score -= P.grupoMorno;
      sinais.push("😐 grupo esfriando");
    }

    // 3) Conta de anúncio (saldo/campanha)
    const s = saldos.find((x) => mesmoCliente(x.cliente, nome));
    if (s) {
      if (s.status === "critico" && /campanha/.test(s.problema ?? "")) {
        score -= P.semCampanha;
        sinais.push("⏸️ nenhuma campanha rodando");
        if (!devendo) acao = "Cliente ativo sem campanha no ar — religar/pedir saldo urgente.";
      } else if (s.status === "critico") {
        score -= P.contaCritica;
        sinais.push(`🔴 conta: ${s.problema ?? "problema"}`);
        if (!devendo) acao = "Resolver a conta de anúncio (pagamento/bloqueio) hoje.";
      } else if (s.status === "atencao") {
        score -= P.saldoBaixo;
        sinais.push("🟠 saldo baixo");
      }
    }

    clientes.push({ cliente: nome, score: Math.max(0, score), sinais, acao });
  }

  clientes.sort((a, b) => a.score - b.score); // pior primeiro
  return { clientes, gerado: new Date().toISOString() };
}

export function montarMensagemRetencao(r: ResultadoRetencao): string {
  const criticos = r.clientes.filter((c) => c.score < 50);
  const atencao = r.clientes.filter((c) => c.score >= 50 && c.score < 75);
  const saudaveis = r.clientes.filter((c) => c.score >= 75);

  const linha = (c: SaudeCliente) =>
    `• *${c.cliente}* — saúde ${c.score}/100\n  ${c.sinais.join(" · ")}\n  ➡️ ${c.acao}`;

  const partes: string[] = [
    `🩺 *RAIO-X DE RETENÇÃO — MPX*\n${r.clientes.length} clientes | ordenados do mais em risco pro mais saudável`,
  ];

  if (criticos.length) {
    partes.push(`🔴 *EM RISCO (agir esta semana):*\n\n${criticos.map(linha).join("\n\n")}`);
  }
  if (atencao.length) {
    partes.push(`🟠 *Atenção:*\n\n${atencao.map(linha).join("\n\n")}`);
  }
  partes.push(`🟢 *Saudáveis:* ${saudaveis.length} clientes sem sinal de risco relevante.`);

  if (!criticos.length && !atencao.length) {
    partes.push("Carteira sem risco relevante. Retenção em dia. 👏");
  }
  return partes.join("\n\n");
}
