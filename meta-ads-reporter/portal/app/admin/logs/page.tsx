import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  success: "#00C851", error: "#FF5A65", running: "#FF8800", sent: "#00C851", failed: "#FF5A65", pending: "#FF8800",
};
const statusLabel: Record<string, string> = {
  success: "Sucesso", error: "Erro", running: "Rodando", sent: "Enviado", failed: "Falhou", pending: "Pendente",
};

export default async function LogsPage() {
  if (!(await getAdminSession())) redirect("/admin/login");

  const [syncLogs, whatsappLogs] = await Promise.all([
    db.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 50, include: { client: { select: { name: true } } } }),
    db.whatsAppLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { client: { select: { name: true } } } }),
  ]);

  return (
    <div>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "#1C1E21" }}>Logs de execução</h1>

      <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Sincronizações e relatórios</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #F5F6FA" }}>
                {["Cliente", "Tipo", "Status", "Mensagem", "Duração", "Quando"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8B8FA8", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((log) => {
                const duration = log.finishedAt
                  ? `${((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000).toFixed(1)}s`
                  : "—";
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid #F5F6FA" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{log.client?.name ?? "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#5C6080" }}>{log.type}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ color: statusColor[log.status] ?? "#8B8FA8", fontWeight: 600 }}>{statusLabel[log.status] ?? log.status}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#5C6080", maxWidth: 280 }}>
                      <span title={log.message ?? ""}>{(log.message ?? "").slice(0, 70)}{(log.message?.length ?? 0) > 70 ? "…" : ""}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#8B8FA8" }}>{duration}</td>
                    <td style={{ padding: "10px 12px", color: "#8B8FA8", whiteSpace: "nowrap" }}>
                      {new Date(log.startedAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
              {syncLogs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#8B8FA8" }}>Nenhum log ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: "#FFF", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Envios por WhatsApp</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F5F6FA" }}>
              {["Cliente", "Telefone", "Status", "Message ID", "Quando"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8B8FA8", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {whatsappLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid #F5F6FA" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>{log.client?.name ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#5C6080" }}>{log.phone}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ color: statusColor[log.status] ?? "#8B8FA8", fontWeight: 600 }}>{statusLabel[log.status] ?? log.status}</span>
                  {log.error && <span style={{ display: "block", fontSize: 11, color: "#FF5A65" }}>{log.error.slice(0, 60)}</span>}
                </td>
                <td style={{ padding: "10px 12px", color: "#8B8FA8", fontSize: 11 }}>{log.messageId ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#8B8FA8", whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
            {whatsappLogs.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#8B8FA8" }}>Nenhum envio ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
