import { CampaignMetrics, ReportData } from "@/lib/meta/normalize";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

export interface Insight {
  type: "success" | "warning" | "info" | "neutral";
  text: string;
}

export function generateInsights(data: ReportData): Insight[] {
  const insights: Insight[] = [];
  const { campaigns, totals } = data;

  const active = campaigns.filter((c) => c.spend > 0);
  if (!active.length) {
    insights.push({ type: "neutral", text: "Nenhuma campanha com investimento no período." });
    return insights;
  }

  // Melhor CTR
  const byCtr = [...active].sort((a, b) => b.ctr - a.ctr)[0];
  if (byCtr.ctr > 0) {
    insights.push({
      type: "success",
      text: `Melhor CTR: "${byCtr.name}" com ${fmtPct(byCtr.ctr)} — acima da média do período (${fmtPct(totals.ctr)}).`,
    });
  }

  // Campanha com mais conversas
  const comConversas = active.filter((c) => (c.conversasIniciadas ?? 0) > 0);
  if (comConversas.length) {
    const top = [...comConversas].sort(
      (a, b) => (b.conversasIniciadas ?? 0) - (a.conversasIniciadas ?? 0)
    )[0];
    insights.push({
      type: "success",
      text: `Mais conversas: "${top.name}" gerou ${top.conversasIniciadas} conversa(s) no WhatsApp${top.custoPorConversa ? ` ao custo de ${fmtBRL(top.custoPorConversa)} cada` : ""}.`,
    });

    // Menor custo por conversa
    const comCusto = comConversas.filter((c) => c.custoPorConversa !== null);
    if (comCusto.length > 1) {
      const maisBarata = [...comCusto].sort(
        (a, b) => (a.custoPorConversa ?? 0) - (b.custoPorConversa ?? 0)
      )[0];
      insights.push({
        type: "success",
        text: `Custo por conversa mais baixo: "${maisBarata.name}" com ${fmtBRL(maisBarata.custoPorConversa!)}.`,
      });
    }
  }

  // Campanhas com gasto alto e sem resultado
  const semResultado = active.filter(
    (c) =>
      c.spend > 50 &&
      (c.conversasIniciadas ?? 0) === 0 &&
      (c.leads ?? 0) === 0 &&
      (c.compras ?? 0) === 0
  );
  for (const c of semResultado) {
    insights.push({
      type: "warning",
      text: `Atenção: "${c.name}" investiu ${fmtBRL(c.spend)} sem conversões registradas — revisar segmentação ou criativo.`,
    });
  }

  // CPC alto vs referência
  const altoCpc = active.filter((c) => c.cpc > 5 && c.clicks > 10);
  for (const c of altoCpc) {
    insights.push({
      type: "warning",
      text: `CPC elevado: "${c.name}" está com CPC de ${fmtBRL(c.cpc)} — avaliar qualidade do anúncio.`,
    });
  }

  // Total gasto
  insights.push({
    type: "info",
    text: `Total investido no período: ${fmtBRL(totals.spend)} em ${active.length} campanha(s) ativa(s).`,
  });

  return insights;
}
