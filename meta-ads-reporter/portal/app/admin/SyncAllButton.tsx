"use client";
import { useState } from "react";

export default function SyncAllButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: number; total: number } | null>(null);
  const [show, setShow] = useState(false);

  async function handleSync() {
    if (!confirm(`Sincronizar TODOS os clientes ativos? Isso pode levar alguns minutos.`)) return;
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/admin/sync-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setResult({ ok: data.ok, errors: data.errors, total: data.total });
      setShow(true);
      setTimeout(() => setShow(false), 6000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          padding: "11px 22px", borderRadius: 10, border: "none",
          background: loading ? "#9DB8F2" : "#1877F2", color: "#FFF",
          fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 2px 8px rgba(24,119,242,0.3)",
        }}
      >
        {loading ? (
          <>⏳ Sincronizando todos...</>
        ) : (
          <>🔄 Sincronizar Todos</>
        )}
      </button>

      {show && result && (
        <div style={{
          fontSize: 12, color: result.errors > 0 ? "#FF8800" : "#00C851",
          fontWeight: 600, background: "#FFF", padding: "6px 12px",
          borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}>
          ✅ {result.ok}/{result.total} sincronizados
          {result.errors > 0 && ` · ❌ ${result.errors} erro(s)`}
        </div>
      )}
    </div>
  );
}
