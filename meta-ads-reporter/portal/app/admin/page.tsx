import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SyncAllButton from "./SyncAllButton";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, color = "#1877F2", icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{
      background: "#FFF", borderRadius: 14, padding: "22px 24px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: 600, color: "#1C1E21", fontSize: 14, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  if (!(await getAdminSession())) redirect("/admin/login");

  const [totalClients, activeClients, totalSnapshots, recentLogs, tokenErrors, whatsappSent] = await Promise.all([
    db.client.count(),
    db.client.count({ where: { active: true } }),
    db.reportSnapshot.count(),
    db.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { client: { select: { name: true } } },
    }),
    db.adAccount.count({ where: { tokenStatus: { in: ["expired", "error"] } } }),
    db.whatsAppLog.count({ where: { status: "sent" } }),
  ]);

  const statusColor: Record<string, string> = {
    success: "#00C851", error: "#FF5A65", running: "#FF8800",
  };
  const statusIcon: Record<string, string> = {
    success: "✅", error: "❌", running: "⏳",
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1C1E21" }}>Dashboard</h1>
          <p style={{ margin: "5px 0 0", color: "#9CA3AF", fontSize: 14 }}>
            Visão geral do sistema Meta Ads Reporter
          </p>
        </div>
        <SyncAllButton />
      </div>

      {/* Alerta de token expirado */}
      {tokenErrors > 0 && (
        <div style={{
          background: "#FFF9E6", border: "1px solid #F59E0B", borderRadius: 12,
          padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center",
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong style={{ color: "#92400E", fontSize: 14 }}>
              {tokenErrors} conta(s) com token expirado
            </strong>
            <p style={{ margin: "2px 0 0", color: "#92400E", fontSize: 13 }}>
              Acesse <a href="/admin/clientes" style={{ color: "#92400E", fontWeight: 600 }}>Clientes → Editar</a> e atualize o Access Token de cada conta afetada.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard icon="👥" label="Clientes ativos" value={activeClients} sub={`${totalClients} cadastrados`} color="#1877F2" />
        <StatCard icon="📊" label="Relatórios gerados" value={totalSnapshots} color="#00C851" />
        <StatCard icon="📱" label="WhatsApp enviados" value={whatsappSent} color="#25D366" />
        <StatCard icon="🔑" label="Tokens com problema" value={tokenErrors} color={tokenErrors > 0 ? "#FF5A65" : "#00C851"} />
      </div>

      {/* Ações rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { href: "/admin/clientes/novo", label: "➕ Novo cliente", color: "#1877F2" },
          { href: "/admin/importar", label: "📥 Importar clients.json", color: "#7C3AED" },
          { href: "/admin/clientes", label: "👥 Ver todos os clientes", color: "#0891B2" },
          { href: "/admin/logs", label: "📋 Ver logs", color: "#059669" },
        ].map((a) => (
          <a key={a.href} href={a.href} style={{
            display: "block", padding: "14px 18px", borderRadius: 10, textDecoration: "none",
            background: "#FFF", border: `1px solid ${a.color}20`, color: a.color,
            fontWeight: 600, fontSize: 13, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            {a.label}
          </a>
        ))}
      </div>

      {/* Últimas execuções */}
      <div style={{ background: "#FFF", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>
          Últimas execuções
        </h2>

        {recentLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
            <p style={{ margin: 0, fontSize: 14 }}>Nenhuma execução ainda.</p>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              Vá em <a href="/admin/clientes" style={{ color: "#1877F2" }}>Clientes</a> e clique em Sincronizar.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #F9FAFB" }}>
                  {["", "Cliente", "Tipo", "Mensagem", "Duração", "Quando"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 14px", color: "#9CA3AF", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const ms = log.finishedAt
                    ? new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()
                    : null;
                  const duration = ms !== null ? (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`) : "—";
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "10px 14px", fontSize: 16 }}>
                        {statusIcon[log.status] ?? "⏳"}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1C1E21" }}>
                        {log.client?.name ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: 11, background: "#F3F4F6", color: "#6B7280",
                          padding: "3px 8px", borderRadius: 99, fontWeight: 600,
                        }}>
                          {log.type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: statusColor[log.status] ?? "#6B7280", maxWidth: 320 }}>
                        {log.message?.slice(0, 80) ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#9CA3AF" }}>{duration}</td>
                      <td style={{ padding: "10px 14px", color: "#9CA3AF", whiteSpace: "nowrap" }}>
                        {new Date(log.startedAt).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
