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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1E21", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8B8FA8" }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #E4E6EB", fontSize: 14, outline: "none",
  boxSizing: "border-box", background: "#FFF", color: "#1C1E21",
};

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", whatsappPhone: "", scheduleDay: "monday", scheduleHour: 8,
    autoSend: true, adAccountId: "", adAccountName: "", accessToken: "",
  });

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/clientes");
    } else {
      const j = await res.json();
      setError(j.error ?? "Erro ao criar cliente");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <a href="/admin/clientes" style={{ color: "#8B8FA8", fontSize: 13, textDecoration: "none" }}>← Clientes</a>
        <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 700, color: "#1C1E21" }}>Novo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div style={{ background: "#FFF", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Dados do cliente</h2>
          <Field label="Nome *">
            <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Pizzaria Mineiros" required />
          </Field>
          <Field label="WhatsApp" hint="Formato internacional: 5564999999999">
            <input style={inputStyle} value={form.whatsappPhone} onChange={(e) => set("whatsappPhone", e.target.value)} placeholder="5564999999999" />
          </Field>
        </div>

        <div style={{ background: "#FFF", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Conta de anúncio</h2>
          <Field label="ID da conta *" hint="Formato: act_XXXXXXXX">
            <input style={inputStyle} value={form.adAccountId} onChange={(e) => set("adAccountId", e.target.value)} placeholder="act_123456789" required />
          </Field>
          <Field label="Nome da conta">
            <input style={inputStyle} value={form.adAccountName} onChange={(e) => set("adAccountName", e.target.value)} placeholder="Ex: Pizzaria Mineiros Ads" />
          </Field>
          <Field label="Access Token *" hint="Token do Meta com permissão ads_read">
            <input style={inputStyle} value={form.accessToken} onChange={(e) => set("accessToken", e.target.value)} placeholder="EAANo..." required type="password" />
          </Field>
        </div>

        <div style={{ background: "#FFF", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>Agendamento</h2>
          <Field label="Dia do envio">
            <select style={inputStyle} value={form.scheduleDay} onChange={(e) => set("scheduleDay", e.target.value)}>
              {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Hora do envio">
            <input style={inputStyle} type="number" min={0} max={23} value={form.scheduleHour} onChange={(e) => set("scheduleHour", parseInt(e.target.value))} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.autoSend} onChange={(e) => set("autoSend", e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, color: "#1C1E21" }}>Enviar automaticamente por WhatsApp</span>
          </label>
        </div>

        {error && <p style={{ color: "#FF5A65", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={loading} style={{
            padding: "12px 28px", borderRadius: 8, border: "none",
            background: loading ? "#9DB8F2" : "#1877F2", color: "#FFF",
            fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Salvando..." : "Criar cliente"}
          </button>
          <a href="/admin/clientes" style={{
            padding: "12px 20px", borderRadius: 8, border: "1px solid #E4E6EB",
            background: "#FFF", color: "#5C6080", fontSize: 14, textDecoration: "none", fontWeight: 600,
          }}>
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
