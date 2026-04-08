"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Senha incorreta");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1A1D27", borderRadius: 16, padding: "48px 40px", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>Meta Ads Reporter</h1>
          <p style={{ margin: "6px 0 0", color: "#8B8FA8", fontSize: 14 }}>Área administrativa</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Senha de acesso"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #2D3148",
              background: "#252836", color: "#FFFFFF", fontSize: 15, outline: "none",
              boxSizing: "border-box", marginBottom: 16,
            }}
            autoFocus
          />
          {error && (
            <p style={{ color: "#FF5A65", fontSize: 13, margin: "0 0 12px", textAlign: "center" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px", borderRadius: 8, border: "none",
              background: loading ? "#3D5A99" : "#1877F2", color: "#FFF",
              fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
