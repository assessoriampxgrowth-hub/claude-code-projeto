export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "#F0F2F5", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 48, fontWeight: 700, color: "#1C1E21" }}>404</h1>
        <p style={{ margin: "0 0 24px", color: "#65676B", fontSize: 16 }}>Página não encontrada</p>
        <a href="/admin" style={{
          background: "#1877F2", color: "#FFF", textDecoration: "none",
          padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
        }}>
          Ir para o Admin
        </a>
      </div>
    </div>
  );
}
