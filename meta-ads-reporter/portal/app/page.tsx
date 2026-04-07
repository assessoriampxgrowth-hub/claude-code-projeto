import { list } from "@vercel/blob";
import Link from "next/link";

interface ClientEntry {
  id: string;
  name: string;
}

async function getClients(): Promise<ClientEntry[]> {
  try {
    const { blobs } = await list({ prefix: "reports/clients.json" });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Page() {
  const clients = await getClients();

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{
        background: "#1877F2", borderRadius: 12,
        padding: "28px 32px", marginBottom: 32, color: "#fff",
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📊 Portal de Relatórios Meta Ads</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.85, fontSize: 14 }}>
          Selecione um cliente para ver os relatórios
        </p>
      </div>

      {clients.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: 12, padding: 40,
          textAlign: "center", color: "#65676B",
        }}>
          Nenhum relatório disponível ainda.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {clients.map((c) => (
            <Link key={c.id} href={`/cliente/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff", borderRadius: 12, padding: "24px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                cursor: "pointer", transition: "box-shadow 0.2s",
                borderLeft: "4px solid #1877F2",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
                <div style={{ fontWeight: 700, color: "#1C1E21", fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#1877F2", marginTop: 6 }}>Ver relatórios →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
