// BRIEF DE SEXTA (CEO) — raio-x da MPX inteira numa mensagem, toda sexta.
// Junta saúde financeira (carteira/planilha) + retenção (raio-x) + escala
// (upsell) num resumo executivo pro Matheus fechar a semana e planejar a próxima.

import { carregarCarteira, CarteiraFinanceira } from "./cobranca-clientes";
import { raioXRetencao } from "./retencao";
import { analisarEscala } from "./escala";

const brl = (v: number) => `R$${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export async function montarBriefSemanal(): Promise<string> {
  const [carteira, retencao, escala] = await Promise.all([
    carregarCarteira().catch(
      (): CarteiraFinanceira => ({ carteira: [], devedores: [], ativosSemDia: [], fonte: "reserva" })
    ),
    raioXRetencao().catch(() => ({ clientes: [], gerado: "" })),
    analisarEscala().catch(() => []),
  ]);

  // MRR = soma dos fees dos ativos com fee conhecido.
  const mrr = carteira.carteira.reduce((s: number, c) => s + c.fee, 0);
  const nAtivos = carteira.carteira.length + carteira.ativosSemDia.length;
  const emAberto = carteira.devedores.reduce((s: number, d) => s + (d.fee ?? 0), 0);

  const emRisco = retencao.clientes.filter((c) => c.score < 50);
  const prontosEscalar = escala.filter((o) => o.tipo === "escalar");
  const otimizar = escala.filter((o) => o.tipo === "otimizar_antes");

  const partes: string[] = [
    `📣 *BRIEF DE SEXTA — MPX Multiplica*\n_Raio-x da semana, ${new Date().toLocaleDateString("pt-BR")}_`,

    `💵 *Saúde financeira*\n` +
      `• MRR estimado: *${brl(mrr)}/mês* (${nAtivos} ativos)\n` +
      `• Devedores: ${carteira.devedores.length}${emAberto ? ` (~${brl(emAberto)} em aberto)` : ""}`,

    emRisco.length
      ? `🚨 *Clientes em risco de churn (${emRisco.length}):*\n` +
          emRisco.map((c) => `• ${c.cliente} (saúde ${c.score}/100) — ${c.acao}`).join("\n")
      : `🟢 *Retenção:* nenhum cliente em risco crítico. 👏`,

    prontosEscalar.length
      ? `💰 *Oportunidade de MRR — prontos pra escalar (${prontosEscalar.length}):*\n` +
          prontosEscalar.map((o) => `• ${o.cliente} (CPL ${o.cpl7d.toFixed(2).replace(".", ",")})`).join("\n") +
          `\n_Propor aumento de verba = mais faturamento sem cliente novo._`
      : `📈 *Escala:* sem cliente com sinal claro de aumento de verba esta semana.`,

    `🎯 *Foco sugerido pra próxima semana:*\n` +
      (emRisco.length ? `1. Salvar os ${emRisco.length} em risco de churn (prioridade máxima)\n` : "") +
      (carteira.devedores.length ? `2. Cobrar os ${carteira.devedores.length} devedores\n` : "") +
      (prontosEscalar.length ? `3. Propor escala pros ${prontosEscalar.length} prontos\n` : "") +
      (otimizar.length ? `4. Otimizar CPL dos ${otimizar.length} que estão caros` : ""),

    `_Bom fim de semana. A máquina segue rodando sozinha. 🚀_`,
  ];

  return partes.join("\n\n");
}
