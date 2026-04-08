import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Meta Ads Reporter" };

const NAV = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/clientes", label: "👥 Clientes" },
  { href: "/admin/logs", label: "📋 Logs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F6FA" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: "#0F1117", display: "flex",
        flexDirection: "column", padding: "24px 0", flexShrink: 0,
        position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1E2135" }}>
          <div style={{ fontSize: 22 }}>📊</div>
          <div style={{ color: "#FFF", fontWeight: 700, fontSize: 14, marginTop: 6 }}>Meta Ads</div>
          <div style={{ color: "#5C6080", fontSize: 11 }}>Reporter Admin</div>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "block", padding: "10px 12px", borderRadius: 8,
                color: "#C0C4D8", textDecoration: "none", fontSize: 13,
                marginBottom: 2, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1A1D27"; (e.currentTarget as HTMLElement).style.color = "#FFF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#C0C4D8"; }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid #1E2135" }}>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                width: "100%", padding: "9px", borderRadius: 8, border: "none",
                background: "#1E2135", color: "#8B8FA8", fontSize: 12,
                cursor: "pointer", textAlign: "center",
              }}
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
