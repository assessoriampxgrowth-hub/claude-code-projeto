import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReportData, CampaignMetrics } from "@/lib/meta/normalize";
import { generateInsights } from "@/lib/reports/insights-text";

export const dynamic = "force-dynamic";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtInt(v: number) { return v.toLocaleString("pt-BR"); }
function fmtPct(v: number) { return `${v.toFixed(2)}%`; }
function orDash(v: number | null | undefined, fmt: (n: number) => string) {
  return v !== null && v !== undefined ? fmt(v) : "—";
}

function KPICard({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "#1877F2" : "#FFF",
      borderRadius: 12, padding: "18px 20px",
      boxShadow: highlight ? "0 4px 16px rgba(24,119,242,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
      border: highlight ? "none" : "1px solid #F0F2F5",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? "#FFF" : "#1877F2" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? "rgba(255,255,255,0.85)" : "#1C1E21", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,0.65)" : "#8B8FA8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const classLabel: Record<string, string> = {
  mensagens: "💬 Mensagens",
  seguidores: "👥 Seguidores",
  leads: "📋 Leads",
  vendas: "🛒 Vendas",
  trafego: "🔗 Tráfego",
  branding: "📢 Branding",
  outros: "🔵 Outros",
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    ACTIVE: ["#E6F9ED", "#00C851"],
    PAUSED: ["#FFF3E0", "#FF8800"],
    ARCHIVED: ["#F5F6FA", "#8B8FA8"],
  };
  const [bg, color] = colors[status] ?? colors.ARCHIVED;
  return (
    <span style={{ fontSize: 10, background: bg, color, padding: "2px 7px", borderRadius: 99, fontWeight: 600 }}>
      {status === "ACTIVE" ? "Ativa" : status === "PAUSED" ? "Pausada" : "Arquivada"}
    </span>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const snapshot = await db.reportSnapshot.findUnique({
    where: { token },
    include: {
      client: { select: { name: true } },
      adAccount: { select: { accountName: true, accountId: true } },
    },
  });

  if (!snapshot) notFound();

  const data = snapshot.data as ReportData;
  const { totals, campaigns, period } = data;
  const insights = generateInsights(data);
  const activeCampaigns = campaigns.filter((c: CampaignMetrics) => c.spend > 0);
  const syncedAt = new Date(data.syncedAt).toLocaleString("pt-BR");

  // Histórico de relatórios
  const history = await db.reportSnapshot.findMany({
    where: { clientId: snapshot.clientId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, token: true, periodStart: true, periodEnd: true, data: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F5", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1877F2", padding: "24px 0", marginBottom: 0 }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>📊 Relatório Meta Ads</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#FFF" }}>{snapshot.client.name}</h1>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>
              📅 {period.start} → {period.end}
              <span style={{ marginLeft: 16, opacity: 0.7 }}>🔄 Atualizado: {syncedAt}</span>
            </div>
          </div>
          <a
            href={`/api/report/${token}/pdf`}
            style={{
              background: "rgba(255,255,255,0.15)", color: "#FFF", textDecoration: "none",
              padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ⬇ Baixar PDF
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px" }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
          <KPICard label="Investimento" value={fmtBRL(totals.spend)} highlight />
          <KPICard label="Alcance" value={fmtInt(totals.reach)} />
          <KPICard label="Impressões" value={fmtInt(totals.impressions)} />
          <KPICard label="Cliques" value={fmtInt(totals.clicks)} />
          <KPICard label="CTR" value={fmtPct(totals.ctr)} sub="Taxa de cliques" />
          <KPICard label="CPC Médio" value={fmtBRL(totals.cpc)} />
          {totals.conversasIniciadas !== null && (
            <KPICard label="Conversas WhatsApp" value={fmtInt(totals.conversasIniciadas)} />
          )}
          {totals.custoPorConversa !== null && (
            <KPICard label="Custo por conversa" value={fmtBRL(totals.custoPorConversa)} />
          )}
          {totals.leads !== null && <KPICard label="Leads" value={fmtInt(totals.leads)} />}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>💡 Análise do período</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.map((ins, i) => {
                const color = ins.type === "success" ? "#00C851" : ins.type === "warning" ? "#FF8800" : "#8B8FA8";
                const bg = ins.type === "success" ? "#E6F9ED" : ins.type === "warning" ? "#FFF3E0" : "#F5F6FA";
                return (
                  <div key={i} style={{ background: bg, borderRadius: 8, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: color, marginTop: 4, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 14, color: "#1C1E21", lineHeight: 1.5 }}>{ins.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Campaign table */}
        {activeCampaigns.length > 0 && (
          <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20, overflowX: "auto" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>📋 Desempenho por campanha</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F5F6FA" }}>
                  {["Campanha", "Tipo", "Status", "Invest.", "Impressões", "Cliques", "CTR", "CPC", "Conversas", "Custo/Conversa", "Leads"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: h === "Campanha" ? "left" : "right", color: "#8B8FA8", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "2px solid #E4E6EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeCampaigns.map((c: CampaignMetrics, i: number) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F5F6FA", background: i % 2 === 1 ? "#FAFBFC" : "#FFF" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1C1E21", maxWidth: 220 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.name}>{c.name}</div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#5C6080" }}>{classLabel[c.classification] ?? c.classification}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#1877F2" }}>{fmtBRL(c.spend)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtInt(c.impressions)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtInt(c.clicks)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtPct(c.ctr)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtBRL(c.cpc)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{orDash(c.conversasIniciadas, fmtInt)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{orDash(c.custoPorConversa, fmtBRL)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{orDash(c.leads, fmtInt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>🕓 Histórico de relatórios</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {history.map((h) => {
                const d = h.data as { period: { start: string; end: string }; totals: { spend: number } };
                const isCurrent = h.token === token;
                return (
                  <a
                    key={h.id}
                    href={`/r/${h.token}`}
                    style={{
                      display: "block", textDecoration: "none",
                      background: isCurrent ? "#EEF4FF" : "#F5F6FA",
                      border: isCurrent ? "1px solid #1877F2" : "1px solid #E4E6EB",
                      borderRadius: 10, padding: "14px 16px",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1E21" }}>
                      {d.period.start} → {d.period.end}
                    </div>
                    <div style={{ fontSize: 12, color: "#8B8FA8", marginTop: 4 }}>
                      {fmtBRL(d.totals?.spend ?? 0)} investidos
                    </div>
                    {isCurrent && <div style={{ fontSize: 11, color: "#1877F2", marginTop: 4, fontWeight: 600 }}>Atual</div>}
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#1877F2" }}>Ver →</span>
                      <a href={`/api/report/${h.token}/pdf`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: "#8B8FA8", textDecoration: "none" }}>⬇ PDF</a>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "20px 0", color: "#C0C4D8", fontSize: 12 }}>
          Gerado por Meta Ads Reporter · {syncedAt}
        </div>
      </div>
    </div>
  );
}
