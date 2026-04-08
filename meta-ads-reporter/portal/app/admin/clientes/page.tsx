import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientActions from "./ClientActions";

export const dynamic = "force-dynamic";

const tokenBadge: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Ativo", color: "#00C851", bg: "#E6F9ED" },
  expired: { label: "Expirado", color: "#FF5A65", bg: "#FFE9EA" },
  error: { label: "Erro", color: "#FF8800", bg: "#FFF3E0" },
};

export default async function ClientesPage() {
  if (!(await getAdminSession())) redirect("/admin/login");

  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    include: {
      adAccounts: { where: { active: true } },
      _count: { select: { reportSnapshots: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1C1E21" }}>Clientes</h1>
          <p style={{ margin: "4px 0 0", color: "#8B8FA8", fontSize: 14 }}>{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <a href="/admin/clientes/novo" style={{
          background: "#1877F2", color: "#FFF", textDecoration: "none",
          padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
        }}>
          + Novo cliente
        </a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {clients.map((client) => {
          const acc = client.adAccounts[0];
          const badge = acc ? (tokenBadge[acc.tokenStatus] ?? tokenBadge.active) : null;
          return (
            <div key={client.id} style={{
              background: "#FFF", borderRadius: 12, padding: "18px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderLeft: `4px solid ${client.active ? "#1877F2" : "#E4E6EB"}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#1C1E21" }}>{client.name}</span>
                  {!client.active && (
                    <span style={{ fontSize: 11, background: "#F5F6FA", color: "#8B8FA8", padding: "2px 8px", borderRadius: 99 }}>Inativo</span>
                  )}
                  {badge && (
                    <span style={{ fontSize: 11, background: badge.bg, color: badge.color, padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#8B8FA8", display: "flex", gap: 16 }}>
                  {acc && <span>📣 {acc.accountName ?? acc.accountId}</span>}
                  {client.whatsappPhone && <span>📱 {client.whatsappPhone}</span>}
                  <span>📋 {client._count.reportSnapshots} relatório(s)</span>
                  {acc?.lastSyncAt && (
                    <span>🔄 {new Date(acc.lastSyncAt).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              </div>
              <ClientActions clientId={client.id} clientName={client.name} />
            </div>
          );
        })}
        {clients.length === 0 && (
          <div style={{ background: "#FFF", borderRadius: 12, padding: 40, textAlign: "center", color: "#8B8FA8" }}>
            Nenhum cliente cadastrado. <a href="/admin/clientes/novo" style={{ color: "#1877F2" }}>Adicionar primeiro cliente →</a>
          </div>
        )}
      </div>
    </div>
  );
}
