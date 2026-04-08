import type { Metadata } from "next";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin — Meta Ads Reporter" };

const NAV = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/clientes", label: "👥 Clientes" },
  { href: "/admin/importar", label: "📥 Importar" },
  { href: "/admin/logs", label: "📋 Logs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuth = await getAdminSession();

  // Login page: sem sidebar, só fundo escuro
  if (!isAuth) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F6FA" }}>
      {/* Sidebar */}
      <aside style={{
        width: 230, background: "#0F1117", display: "flex",
        flexDirection: "column", flexShrink: 0,
        position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #1E2135" }}>
          <div style={{ fontSize: 26 }}>📊</div>
          <div style={{ color: "#FFF", fontWeight: 700, fontSize: 15, marginTop: 8 }}>Meta Ads</div>
          <div style={{ color: "#5C6080", fontSize: 11, marginTop: 2 }}>Reporter v2.0</div>
        </div>

        <nav style={{ padding: "12px", flex: 1 }}>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "block", padding: "10px 14px", borderRadius: 8,
                color: "#9CA3B8", textDecoration: "none", fontSize: 13,
                marginBottom: 2, fontWeight: 500,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid #1E2135" }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{
              width: "100%", padding: "9px", borderRadius: 8, border: "none",
              background: "#1E2135", color: "#6B7280", fontSize: 12,
              cursor: "pointer", textAlign: "center" as const,
            }}>
              🚪 Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
