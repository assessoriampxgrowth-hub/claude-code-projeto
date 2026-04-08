"use client";
import { useState } from "react";

export default function ClientActions({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSync() {
    setSyncing(true);
    setMsg("");
    const res = await fetch(`/api/admin/clients/${clientId}/sync`, { method: "POST" });
    setSyncing(false);
    if (res.ok) {
      setMsg("✅ Sincronizado!");
    } else {
      const j = await res.json();
      setMsg(`❌ ${j.error ?? "Erro"}`);
    }
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleWhatsApp() {
    setSending(true);
    setMsg("");
    const res = await fetch(`/api/admin/clients/${clientId}/whatsapp`, { method: "POST" });
    setSending(false);
    if (res.ok) {
      setMsg("✅ WhatsApp enviado!");
    } else {
      const j = await res.json();
      setMsg(`❌ ${j.error ?? "Erro"}`);
    }
    setTimeout(() => setMsg(""), 4000);
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {msg && <span style={{ fontSize: 12, color: msg.startsWith("✅") ? "#00C851" : "#FF5A65" }}>{msg}</span>}
      <button
        onClick={handleSync}
        disabled={syncing}
        title="Sincronizar dados do Meta"
        style={{
          padding: "8px 14px", borderRadius: 7, border: "1px solid #E4E6EB",
          background: "#FFF", color: "#1C1E21", fontSize: 12, fontWeight: 600,
          cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1,
        }}
      >
        {syncing ? "⏳" : "🔄"} Sincronizar
      </button>
      <button
        onClick={handleWhatsApp}
        disabled={sending}
        title="Enviar relatório por WhatsApp"
        style={{
          padding: "8px 14px", borderRadius: 7, border: "none",
          background: "#25D366", color: "#FFF", fontSize: 12, fontWeight: 600,
          cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1,
        }}
      >
        {sending ? "⏳" : "📱"} WhatsApp
      </button>
      <a
        href={`/admin/clientes/${clientId}`}
        style={{
          padding: "8px 14px", borderRadius: 7, border: "1px solid #E4E6EB",
          background: "#FFF", color: "#1877F2", fontSize: 12, fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Editar
      </a>
    </div>
  );
}
