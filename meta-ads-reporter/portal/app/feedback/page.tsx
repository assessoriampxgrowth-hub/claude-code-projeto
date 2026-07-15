"use client";

import { useState } from "react";

// Formulário interno pro time registrar venda/agendamento por criativo.
// Abre no celular, salva no banco, alimenta o Agente de Validação de Criativos.
export default function FeedbackComercialPage() {
  const [form, setForm] = useState({
    chave: "",
    autor: "",
    clienteNome: "",
    criativoNome: "",
    vendas: "",
    agendamentos: "",
    ticketMedio: "",
    nota: "",
  });
  const [status, setStatus] = useState<"" | "enviando" | "ok" | "erro">("");
  const [msg, setMsg] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function enviar() {
    setStatus("enviando");
    setMsg("");
    const res = await fetch("/api/feedback-comercial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (res.ok) {
      setStatus("ok");
      setMsg("Registrado! ✅");
      setForm({ ...form, clienteNome: "", criativoNome: "", vendas: "", agendamentos: "", ticketMedio: "", nota: "" });
    } else {
      setStatus("erro");
      setMsg(json.error ?? "Erro ao salvar");
    }
  }

  const input: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginTop: "4px",
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = { display: "block", marginTop: "14px", fontWeight: 600, fontSize: "14px" };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "24px 18px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "22px", marginBottom: 4 }}>📊 Feedback Comercial</h1>
      <p style={{ color: "#666", fontSize: "14px", marginTop: 0 }}>
        Registre aqui os criativos que geraram venda ou agendamento. É o que faz o robô validar criativo de verdade.
      </p>

      <label style={label}>Chave de acesso</label>
      <input style={input} type="password" value={form.chave} onChange={set("chave")} placeholder="chave do time" />

      <label style={label}>Seu nome</label>
      <input style={input} value={form.autor} onChange={set("autor")} placeholder="ex: Adrian" />

      <label style={label}>Cliente *</label>
      <input style={input} value={form.clienteNome} onChange={set("clienteNome")} placeholder="ex: Ótica Luxell" />

      <label style={label}>Nome do criativo *</label>
      <input style={input} value={form.criativoNome} onChange={set("criativoNome")} placeholder="ex: Exame de Vista R$200" />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Vendas</label>
          <input style={input} type="number" value={form.vendas} onChange={set("vendas")} placeholder="0" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={label}>Agendamentos</label>
          <input style={input} type="number" value={form.agendamentos} onChange={set("agendamentos")} placeholder="0" />
        </div>
      </div>

      <label style={label}>Ticket médio (opcional)</label>
      <input style={input} type="number" value={form.ticketMedio} onChange={set("ticketMedio")} placeholder="R$" />

      <label style={label}>Observação (opcional)</label>
      <textarea
        style={{ ...input, minHeight: 70 }}
        value={form.nota}
        onChange={set("nota")}
        placeholder="ex: leads bons, mas vendedor demorou pra responder"
      />

      <button
        onClick={enviar}
        disabled={status === "enviando"}
        style={{
          width: "100%",
          marginTop: 20,
          padding: 14,
          fontSize: 16,
          fontWeight: 700,
          color: "#fff",
          background: status === "enviando" ? "#999" : "#111",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        {status === "enviando" ? "Enviando..." : "Registrar"}
      </button>

      {msg && (
        <p style={{ marginTop: 14, textAlign: "center", color: status === "ok" ? "#0a0" : "#c00", fontWeight: 600 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
