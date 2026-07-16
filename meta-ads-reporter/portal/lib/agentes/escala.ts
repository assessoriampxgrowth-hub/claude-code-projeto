// AGENTE DE ESCALA (gatilho de upsell) — cruza CPL + benchmark do segmento e
// avisa quando um cliente está pronto pra AUMENTAR a verba: CPL bom/ótimo +
// volume consistente = hora de escalar (mais MRR sem cliente novo). Também
// aponta quem está caro (candidato a reduzir/otimizar antes de escalar).

import { varrerCpl } from "./cpl";
import { segmentoDoCliente, BENCHMARK } from "./validacao-criativos";

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

export type OportunidadeEscala = {
  cliente: string;
  cpl7d: number;
  leads7d: number;
  gasto7d: number;
  faixa: { min: number; max: number; rotulo: string };
  tipo: "escalar" | "otimizar_antes" | "estavel";
  recado: string;
};

export async function analisarEscala(): Promise<OportunidadeEscala[]> {
  const cpls = await varrerCpl();
  const out: OportunidadeEscala[] = [];

  for (const c of cpls) {
    if (!c.ok || !c.gasto7d || c.gasto7d <= 0 || c.cpl7d === null) continue;
    const seg = segmentoDoCliente(c.cliente);
    const faixa = BENCHMARK[seg];
    const cpl = c.cpl7d;
    const leads = c.leads7d ?? 0;

    let tipo: OportunidadeEscala["tipo"] = "estavel";
    let recado = "";

    // ESCALAR: CPL dentro/abaixo da faixa E volume consistente (>=8 leads/semana).
    if (cpl <= faixa.max && leads >= 8) {
      tipo = "escalar";
      const margem = cpl <= faixa.min ? "bem abaixo" : "dentro";
      recado = `CPL ${brl(cpl)} ${margem} da faixa (${brl(faixa.min)}–${brl(faixa.max)}) e ${leads} leads/semana. 💰 *Hora de propor aumento de verba* — a estrutura aguenta escala.`;
    }
    // OTIMIZAR ANTES: CPL acima da faixa — não escalar, arrumar primeiro.
    else if (cpl > faixa.max) {
      tipo = "otimizar_antes";
      recado = `CPL ${brl(cpl)} acima da faixa do segmento (${faixa.rotulo}: até ${brl(faixa.max)}). Otimizar criativo/público ANTES de pensar em escalar.`;
    } else {
      recado = `CPL ${brl(cpl)} ok, mas volume baixo (${leads} leads) — deixar maturar antes de escalar.`;
    }

    out.push({ cliente: c.cliente, cpl7d: cpl, leads7d: leads, gasto7d: c.gasto7d, faixa, tipo, recado });
  }

  // Ordena: oportunidades de escala primeiro.
  const ordem = { escalar: 0, otimizar_antes: 1, estavel: 2 };
  out.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || a.cpl7d - b.cpl7d);
  return out;
}

export function montarMensagemEscala(ops: OportunidadeEscala[]): string {
  const escalar = ops.filter((o) => o.tipo === "escalar");
  const otimizar = ops.filter((o) => o.tipo === "otimizar_antes");

  const partes: string[] = [`📈 *RADAR DE ESCALA — MPX*\n${ops.length} contas com movimento nos últimos 7 dias`];

  if (escalar.length) {
    partes.push(
      `💰 *PRONTOS PRA ESCALAR (propor aumento de verba):*\n\n` +
        escalar.map((o) => `• *${o.cliente}*\n  ${o.recado}`).join("\n\n")
    );
  } else {
    partes.push(`💰 Nenhum cliente com sinal claro de escala esta semana.`);
  }

  if (otimizar.length) {
    partes.push(
      `🔧 *Otimizar antes de escalar:*\n` +
        otimizar.map((o) => `• *${o.cliente}* — ${o.recado}`).join("\n")
    );
  }

  partes.push(`_Escalar cliente bom = mais MRR sem precisar de cliente novo._`);
  return partes.join("\n\n");
}
