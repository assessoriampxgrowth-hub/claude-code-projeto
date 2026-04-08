import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, color = "#1877F2" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontWeight: 600, color: "#1C1E21", fontSize: 14, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ color: "#8B8FA8", fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  if (!(await getAdminSession())) redirect("/admin/login");

  const [totalClients, activeClients, totalSnapshots, recentLogs, tokenErrors] = await Promise.all([
    db.client.count(),
    db.client.count({ where: { active: true } }),
    db.reportSnapshot.count(),
    db.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 8, include: { client: { select: { name: true } } } }),
    db.adAccount.count({ where: { tokenStatus: { in: ["expired", "error"] } } }),
  ]);

  const statusColor: Record<string, string> = {
    success: "#00C851", error: "#FF5A65", running: "#FF8800", "": "#8B8FA8",
  };
  const statusLabel: Record<string, string> = {
    success: "Sucesso", error: "Erro", running: "Rodando",
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1C1E21" }}>Dashboard</h1>
        <p style={{ margin: "4px 0 0", color: "#8B8FA8", fontSize: 14 }}>Visão geral do sistema</p>
      </div>

      {tokenErrors > 0 && (
        <div style={{ background: "#FFF3CD", border: "1px solid #FFCA2C", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ color: "#856404", fontSize: 14 }}>
            <strong>{tokenErrors}</strong> conta(s) com token expirado ou com erro.{" "}
            <a href="/admin/clientes" style={{ color: "#856404" }}>Reconectar →</a>
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Clientes ativos" value={activeClients} sub={`${totalClients} total`} color="#1877F2" />
        <StatCard label="Relatórios gerados" value={totalSnapshots} color="#00C851" />
        <StatCard label="Tokens com problema" value={tokenErrors} color={tokenErrors > 0 ? "#FF5A65" : "#00C851"} />
      </div>

      <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Últimas execuções</h2>
        {recentLogs.length === 0 ? (
          <p style={{ color: "#8B8FA8", fontSize: 14 }}>Nenhuma execução ainda.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #F5F6FA" }}>
                {["Cliente", "Tipo", "Status", "Mensagem", "Quando"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8B8FA8", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #F5F6FA" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{log.client?.name ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#5C6080" }}>{log.type}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: statusColor[log.status] ?? "#8B8FA8", fontWeight: 600 }}>
                      {statusLabel[log.status] ?? log.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#5C6080", maxWidth: 300 }}>{log.message?.slice(0, 60) ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#8B8FA8", whiteSpace: "nowrap" }}>
                    {new Date(log.startedAt).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
