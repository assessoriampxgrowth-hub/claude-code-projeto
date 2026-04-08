import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import EditClientForm from "./EditClientForm";

export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) redirect("/admin/login");
  const { id } = await params;

  const client = await db.client.findUnique({
    where: { id },
    include: {
      adAccounts: { where: { active: true } },
      reportSnapshots: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, token: true, data: true, createdAt: true } },
    },
  });
  if (!client) notFound();

  const account = client.adAccounts[0] ?? null;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <a href="/admin/clientes" style={{ color: "#9CA3AF", fontSize: 13, textDecoration: "none" }}>← Clientes</a>
        <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800, color: "#1C1E21" }}>{client.name}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <EditClientForm
          client={{ id: client.id, name: client.name, whatsappPhone: client.whatsappPhone, scheduleDay: client.scheduleDay, scheduleHour: client.scheduleHour, autoSend: client.autoSend, active: client.active }}
          account={account ? { id: account.id, accountId: account.accountId, accountName: account.accountName, tokenStatus: account.tokenStatus } : null}
        />

        <div style={{ background: "#FFF", borderRadius: 14, padding: 22, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1C1E21" }}>
            📊 Relatórios ({client.reportSnapshots.length})
          </h3>
          {client.reportSnapshots.length === 0 ? (
            <p style={{ color: "#9CA3AF", fontSize: 13 }}>Nenhum relatório ainda. Clique em Sincronizar na lista de clientes.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {client.reportSnapshots.map((snap) => {
                const d = JSON.parse(snap.data) as { period: { start: string; end: string }; totals: { spend: number } };
                return (
                  <div key={snap.id} style={{ padding: "12px 14px", background: "#F9FAFB", borderRadius: 10, border: "1px solid #E4E6EB" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1E21" }}>
                      {d.period.start} → {d.period.end}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                      R$ {d.totals?.spend?.toFixed(2) ?? "—"} investidos
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                      <a href={`/r/${snap.token}`} target="_blank" style={{ fontSize: 12, color: "#1877F2", textDecoration: "none", fontWeight: 600 }}>
                        Ver relatório ↗
                      </a>
                      <a href={`/api/report/${snap.token}/pdf`} style={{ fontSize: 12, color: "#6B7280", textDecoration: "none" }}>
                        ⬇ PDF
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
