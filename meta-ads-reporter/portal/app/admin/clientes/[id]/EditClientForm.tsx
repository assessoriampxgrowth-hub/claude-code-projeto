"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = [
  { value: "monday", label: "Segunda-feira" },
  { value: "tuesday", label: "Terça-feira" },
  { value: "wednesday", label: "Quarta-feira" },
  { value: "thursday", label: "Quinta-feira" },
  { value: "friday", label: "Sexta-feira" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #E4E6EB", fontSize: 14, outline: "none",
  boxSizing: "border-box", background: "#FFF", color: "#1C1E21",
};

interface Props {
  client: { id: string; name: string; whatsappPhone: string | null; scheduleDay: string; scheduleHour: number; autoSend: boolean; active: boolean };
  account: { id: string; accountId: string; accountName: string | null; tokenStatus: string } | null;
}

export default function EditClientForm({ client, account }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: client.name,
    whatsappPhone: client.whatsappPhone ?? "",
    scheduleDay: client.scheduleDay,
    scheduleHour: client.scheduleHour,
    autoSend: client.autoSend,
    active: client.active,
    accessToken: "",
    adAccountId: account?.accountId ?? "",
    adAccountName: account?.accountName ?? "",
  });

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("✅ Salvo com sucesso!");
      router.refresh();
    } else {
      const j = await res.json();
      setMsg(`❌ ${j.error ?? "Erro"}`);
    }
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${client.name}"? Todos os relatórios serão removidos.`)) return;
    await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
    router.push("/admin/clientes");
  }

  return (
    <form onSubmit={handleSave}>
      <div style={{ background: "#FFF", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Dados do cliente</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Nome</label>
          <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>WhatsApp</label>
          <input style={inputStyle} value={form.whatsappPhone} onChange={(e) => set("whatsappPhone", e.target.value)} placeholder="5564999999999" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 8 }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          <span style={{ fontSize: 14 }}>Cliente ativo</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={form.autoSend} onChange={(e) => set("autoSend", e.target.checked)} />
          <span style={{ fontSize: 14 }}>Envio automático por WhatsApp</span>
        </label>
      </div>

      <div style={{ background: "#FFF", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>
          Conta de anúncio
          {account && (
            <span style={{ marginLeft: 10, fontSize: 12, padding: "2px 8px", borderRadius: 99, background: account.tokenStatus === "active" ? "#E6F9ED" : "#FFE9EA", color: account.tokenStatus === "active" ? "#00C851" : "#FF5A65" }}>
              {account.tokenStatus === "active" ? "Token ativo" : "Token expirado"}
            </span>
          )}
        </h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>ID da conta</label>
          <input style={inputStyle} value={form.adAccountId} onChange={(e) => set("adAccountId", e.target.value)} placeholder="act_123456789" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Novo access token</label>
          <input style={inputStyle} value={form.accessToken} onChange={(e) => set("accessToken", e.target.value)} placeholder="Cole o novo token aqui" type="password" />
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8B8FA8" }}>Deixe em branco para manter o atual</p>
        </div>
      </div>

      <div style={{ background: "#FFF", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Agendamento</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Dia</label>
            <select style={inputStyle} value={form.scheduleDay} onChange={(e) => set("scheduleDay", e.target.value)}>
              {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Hora</label>
            <input style={inputStyle} type="number" min={0} max={23} value={form.scheduleHour} onChange={(e) => set("scheduleHour", parseInt(e.target.value))} />
          </div>
        </div>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith("✅") ? "#00C851" : "#FF5A65", marginBottom: 12 }}>{msg}</p>}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: "11px 24px", borderRadius: 8, border: "none", background: saving ? "#9DB8F2" : "#1877F2", color: "#FFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <a href="/admin/clientes" style={{ padding: "11px 20px", borderRadius: 8, border: "1px solid #E4E6EB", background: "#FFF", color: "#5C6080", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
            Cancelar
          </a>
        </div>
        <button type="button" onClick={handleDelete} style={{ padding: "11px 20px", borderRadius: 8, border: "1px solid #FF5A65", background: "#FFF", color: "#FF5A65", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
          Excluir
        </button>
      </div>
    </form>
  );
}
