import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReportData, CampaignMetrics } from "@/lib/meta/normalize";
import { generateInsights } from "@/lib/reports/insights-text";

export const dynamic = "force-dynamic";

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtInt(v: number) { return v.toLocaleString("pt-BR"); }
function fmtPct(v: number) { return `${v.toFixed(2)}%`; }
function orDash(v: number | null | undefined, fmt: (n: number) => string) {
  return v !== null && v !== undefined ? fmt(v) : "—";
}

function KPICard({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "#1877F2" : "#FFF", borderRadius: 14,
      padding: "20px 22px", border: highlight ? "none" : "1px solid #E4E6EB",
      boxShadow: highlight ? "0 4px 20px rgba(24,119,242,0.25)" : "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: highlight ? "#FFF" : "#1877F2", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? "rgba(255,255,255,0.9)" : "#1C1E21", marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,0.65)" : "#9CA3AF", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const classLabel: Record<string, string> = {
  mensagens: "💬 Mensagens", seguidores: "👥 Seguidores", leads: "📋 Leads",
  vendas: "🛒 Vendas", trafego: "🔗 Tráfego", branding: "📢 Branding", outros: "🔵 Outros",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ACTIVE: ["#E6F9ED", "#00C851"], PAUSED: ["#FFF3E0", "#FF8800"], ARCHIVED: ["#F5F6FA", "#8B8FA8"],
  };
  const [bg, color] = map[status] ?? map.ARCHIVED;
  return (
    <span style={{ fontSize: 10, background: bg, color, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>
      {status === "ACTIVE" ? "Ativa" : status === "PAUSED" ? "Pausada" : "Arquivada"}
    </span>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const snapshot = await db.reportSnapshot.findUnique({
    where: { token },
    include: { client: { select: { name: true } } },
  });
  if (!snapshot) notFound();

  const data: ReportData = JSON.parse(snapshot.data);
  const { totals, campaigns, period } = data;
  const insights = generateInsights(data);
  const active = campaigns.filter((c: CampaignMetrics) => c.spend > 0);
  const syncedAt = new Date(data.syncedAt).toLocaleString("pt-BR");

  const history = await db.reportSnapshot.findMany({
    where: { clientId: snapshot.clientId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, token: true, data: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F5", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1877F2, #0a5fd4)", padding: "28px 0 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                📊 Relatório Meta Ads
              </div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#FFF" }}>{snapshot.client.name}</h1>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 6, display: "flex", gap: 20 }}>
                <span>📅 {period.start} → {period.end}</span>
                <span>🔄 {syncedAt}</span>
                <span>📣 {data.adAccountName}</span>
              </div>
            </div>
            <a href={`/api/report/${token}/pdf`} style={{
              background: "rgba(255,255,255,0.15)", color: "#FFF", textDecoration: "none",
              padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
            }}>
              ⬇ Baixar PDF
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "28px 24px" }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14, marginBottom: 28 }}>
          <KPICard label="Investimento" value={fmtBRL(totals.spend)} highlight />
          <KPICard label="Alcance" value={fmtInt(totals.reach)} sub="pessoas únicas" />
          <KPICard label="Impressões" value={fmtInt(totals.impressions)} />
          <KPICard label="Cliques" value={fmtInt(totals.clicks)} />
          <KPICard label="CTR" value={fmtPct(totals.ctr)} sub="taxa de cliques" />
          <KPICard label="CPC Médio" value={fmtBRL(totals.cpc)} sub="custo por clique" />
          {totals.conversasIniciadas !== null && (
            <KPICard label="Conversas WhatsApp" value={fmtInt(totals.conversasIniciadas)} />
          )}
          {totals.custoPorConversa !== null && (
            <KPICard label="Custo / Conversa" value={fmtBRL(totals.custoPorConversa)} />
          )}
          {totals.leads !== null && (
            <KPICard label="Leads" value={fmtInt(totals.leads)} />
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div style={{ background: "#FFF", borderRadius: 14, padding: "22px 26px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: 22 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#1C1E21" }}>💡 Análise automática do período</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.map((ins, i) => {
                const color = ins.type === "success" ? "#00C851" : ins.type === "warning" ? "#FF8800" : "#9CA3AF";
                const bg    = ins.type === "success" ? "#F0FDF4" : ins.type === "warning" ? "#FFFBEB" : "#F9FAFB";
                return (
                  <div key={i} style={{ background: bg, borderRadius: 10, padding: "13px 16px", display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${color}` }}>
                    <p style={{ margin: 0, fontSize: 14, color: "#1C1E21", lineHeight: 1.55 }}>{ins.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabela de campanhas */}
        {active.length > 0 && (
          <div style={{ background: "#FFF", borderRadius: 14, padding: "22px 26px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: 22, overflowX: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#1C1E21" }}>📋 Desempenho por campanha</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderRadius: 8 }}>
                  {["Campanha", "Tipo", "Status", "Investido", "Impressões", "Cliques", "CTR", "CPC", "Conversas", "Custo/Conv.", "Leads"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: h === "Campanha" ? "left" : "right",
                      color: "#9CA3AF", fontWeight: 600, whiteSpace: "nowrap",
                      borderBottom: "2px solid #E4E6EB", fontSize: 12,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((c: CampaignMetrics, i: number) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 ? "#FAFAFA" : "#FFF" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "#1C1E21", maxWidth: 240 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.name}>{c.name}</div>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#6B7280" }}>{classLabel[c.classification] ?? c.classification}</span>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "#1877F2" }}>{fmtBRL(c.spend)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmtInt(c.impressions)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmtInt(c.clicks)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmtPct(c.ctr)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmtBRL(c.cpc)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{orDash(c.conversasIniciadas, fmtInt)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{orDash(c.custoPorConversa, fmtBRL)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{orDash(c.leads, fmtInt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Histórico */}
        {history.length > 1 && (
          <div style={{ background: "#FFF", borderRadius: 14, padding: "22px 26px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", marginBottom: 22 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#1C1E21" }}>🕓 Histórico de relatórios</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
              {history.map((h) => {
                const d = JSON.parse(h.data) as { period: { start: string; end: string }; totals: { spend: number } };
                const isCurrent = h.token === token;
                return (
                  <a key={h.id} href={`/r/${h.token}`} style={{
                    display: "block", textDecoration: "none",
                    background: isCurrent ? "#EFF6FF" : "#F9FAFB",
                    border: `1px solid ${isCurrent ? "#1877F2" : "#E4E6EB"}`,
                    borderRadius: 12, padding: "14px 16px",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1E21" }}>
                      {d.period.start} → {d.period.end}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                      {fmtBRL(d.totals?.spend ?? 0)} investidos
                    </div>
                    {isCurrent && <div style={{ fontSize: 11, color: "#1877F2", fontWeight: 700, marginTop: 6 }}>📌 Relatório atual</div>}
                    <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#1877F2", fontWeight: 600 }}>Ver →</span>
                      <a href={`/api/report/${h.token}/pdf`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: "#9CA3AF", textDecoration: "none" }}>⬇ PDF</a>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "16px 0 8px", color: "#D1D5DB", fontSize: 12 }}>
          Relatório gerado por Meta Ads Reporter · {syncedAt}
        </div>
      </div>
    </div>
  );
}
