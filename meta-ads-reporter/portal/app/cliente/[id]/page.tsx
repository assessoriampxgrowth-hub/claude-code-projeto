import { list } from "@vercel/blob";
import Link from "next/link";

interface ReportEntry {
  id: string;
  label: string;
  date: string;
  pdf_url: string;
  generated_at: string;
  summary: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
  };
}

async function getReports(clientId: string): Promise<{ reports: ReportEntry[]; name: string }> {
  try {
    const { blobs } = await list({ prefix: `reports/${clientId}/index.json` });
    if (!blobs.length) return { reports: [], name: clientId };

    const res = await fetch(blobs[0].url, { next: { revalidate: 3600 } });
    if (!res.ok) return { reports: [], name: clientId };

    const reports = await res.json();

    // Busca nome do cliente no registry global
    const { blobs: regBlobs } = await list({ prefix: "reports/clients.json" });
    let name = clientId;
    if (regBlobs.length) {
      const regRes = await fetch(regBlobs[0].url, { next: { revalidate: 3600 } });
      if (regRes.ok) {
        const clients = await regRes.json();
        const found = clients.find((c: { id: string; name: string }) => c.id === clientId);
        if (found) name = found.name;
      }
    }

    return { reports, name };
  } catch {
    return { reports: [], name: clientId };
  }
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtInt(v: number) {
  return v.toLocaleString("pt-BR");
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reports, name } = await getReports(id);

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px" }}>
      {/* Header */}
      <div style={{
        background: "#1877F2", borderRadius: 12,
        padding: "28px 32px", marginBottom: 32, color: "#fff",
      }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, textDecoration: "none" }}>
          ← Todos os clientes
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 700 }}>📊 {name}</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 14 }}>Relatórios de performance Meta Ads</p>
      </div>

      {reports.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#65676B" }}>
          Nenhum relatório disponível ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reports.map((r) => (
            <div key={r.id} style={{
              background: "#fff", borderRadius: 12, padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1C1E21" }}>{r.label}</h2>
                  <span style={{ fontSize: 12, color: "#65676B" }}>
                    Gerado em {new Date(r.generated_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" style={{
                  background: "#1877F2", color: "#fff", textDecoration: "none",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                }}>
                  ⬇ Baixar PDF
                </a>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {[
                  { label: "Investimento", value: fmtBRL(r.summary.spend) },
                  { label: "Impressões",   value: fmtInt(r.summary.impressions) },
                  { label: "Cliques",      value: fmtInt(r.summary.clicks) },
                  { label: "CTR",          value: `${r.summary.ctr.toFixed(2)}%` },
                  { label: "Conversões",   value: fmtInt(r.summary.conversions) },
                ].map((m) => (
                  <div key={m.label} style={{
                    background: "#F5F6FA", borderRadius: 8,
                    padding: "10px 8px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1877F2" }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: "#65676B", marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
