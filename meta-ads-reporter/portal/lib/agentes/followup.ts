// AGENTE DE FOLLOW-UP COMERCIAL — lê o pipeline (mini-CRM) e cobra os
// follow-ups que vencem hoje ou já venceram, pra nenhuma proposta morrer
// esquecida. Também mostra as propostas em aberto (valor em jogo).

import { db } from "@/lib/db";
import { hojeBrasilia } from "@/lib/clickup/ata";

const brl = (v: number) => `R$${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const LABEL_STATUS: Record<string, string> = {
  novo: "Novo lead",
  reuniao: "Reunião marcada",
  proposta: "Proposta enviada",
  negociacao: "Em negociação",
};

export async function montarMensagemFollowup(): Promise<string | null> {
  const hoje = hojeBrasilia();
  const fimDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

  const leads = await db.commercialLead.findMany({
    where: { status: { notIn: ["fechado", "perdido"] } },
    orderBy: { proximoFollowup: "asc" },
  });

  if (!leads.length) return null; // pipeline vazio — não incomoda

  const venceHojeOuAtrasado = leads.filter(
    (l) => l.proximoFollowup && l.proximoFollowup <= fimDoDia
  );
  const propostasAbertas = leads.filter((l) => l.status === "proposta" || l.status === "negociacao");
  const valorEmJogo = propostasAbertas.reduce((s: number, l) => s + (l.valorProposta ?? 0), 0);

  // Só manda se tiver follow-up pra cobrar hoje.
  if (!venceHojeOuAtrasado.length) return null;

  const linha = (l: (typeof leads)[number]) => {
    const atrasado = l.proximoFollowup && l.proximoFollowup < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const flag = atrasado ? "🔴 ATRASADO" : "🟡 hoje";
    const valor = l.valorProposta ? ` | ${brl(l.valorProposta)}` : "";
    const resp = l.responsavel ? ` (${l.responsavel})` : "";
    return `• ${flag} *${l.nome}*${resp} — ${LABEL_STATUS[l.status] ?? l.status}${valor}\n  ${l.nota ?? "sem observação"}`;
  };

  const partes: string[] = [
    `💼 *FOLLOW-UP COMERCIAL — hoje*\n${venceHojeOuAtrasado.length} contato(s) pra fazer follow-up`,
    venceHojeOuAtrasado.map(linha).join("\n\n"),
  ];

  if (propostasAbertas.length) {
    partes.push(
      `📊 *Propostas em aberto:* ${propostasAbertas.length}${valorEmJogo ? ` (~${brl(valorEmJogo)} em jogo)` : ""}`
    );
  }
  partes.push(`_Atualize o status em ${process.env.CLIENT_PORTAL_URL ?? ""}/pipeline depois de cada contato._`);
  return partes.join("\n\n");
}
