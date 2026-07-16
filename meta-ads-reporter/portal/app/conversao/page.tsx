"use client";

import { useState } from "react";

// Registro de conversão do cliente final: lead agendou/comprou no WhatsApp
// do cliente. 20 segundos por venda — o robô manda pro Meta sozinho depois.
export default function ConversaoPage() {
  const [form, setForm] = useState({
    chave: "",
    autor: "",
    clienteNome: "",
    telefone: "",
    evento: "comprou",
    valor: "",
  });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [total, setTotal] = useState(0);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function enviar() {
    setMsg("Enviando...");
    const res = await fetch("/api/conversao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    if (res.ok) {
      setOk(true);
      setTotal((t) => t + 1);
      setMsg(`Registrado! ✅ (${total + 1} nesta sessão)`);
      setForm({ ...form, telefone: "", valor: "" }); // mantém cliente pra registrar em lote
    } else {
      setOk(false);
      setMsg(j.error ?? "Erro");
    }
  }

  const input: React.CSSProperties = { width: "100%", padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ccc", marginTop: 4, boxSizing: "border-box" };
  const label: React.CSSProperties = { display: "block", marginTop: 14, fontWeight: 600, fontSize: 14 };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "24px 18px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>🎯 Registrar Conversão</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>
        Lead agendou ou comprou no WhatsApp do cliente? Registra aqui (20s). O robô manda pro Meta e a campanha aprende com quem COMPRA.
      </p>

      <label style={label}>Chave de acesso</label>
      <input style={input} type="password" value={form.chave} onChange={set("chave")} placeholder="chave do time" />

      <label style={label}>Seu nome</label>
      <input style={input} value={form.autor} onChange={set("autor")} placeholder="ex: Adrian" />

      <label style={label}>Cliente (a loja) *</label>
      <input style={input} value={form.clienteNome} onChange={set("clienteNome")} placeholder="ex: Dino Store" />

      <label style={label}>Telefone do lead *</label>
      <input style={input} value={form.telefone} onChange={set("telefone")} placeholder="64 99999-9999" inputMode="tel" />

      <label style={label}>O que aconteceu *</label>
      <select style={input} value={form.evento} onChange={set("evento")}>
        <option value="comprou">🟢 Comprou</option>
        <option value="agendou">📅 Agendou visita/consulta</option>
        <option value="desqualificado">❌ Desqualificado</option>
      </select>

      <label style={label}>Valor da venda (opcional)</label>
      <input style={input} type="number" value={form.valor} onChange={set("valor")} placeholder="R$" />

      <button onClick={enviar} style={{ width: "100%", marginTop: 20, padding: 14, fontSize: 16, fontWeight: 700, color: "#fff", background: "#111", border: "none", borderRadius: 8, cursor: "pointer" }}>
        Registrar
      </button>
      {msg && <p style={{ marginTop: 14, textAlign: "center", color: ok ? "#0a0" : "#c00", fontWeight: 600 }}>{msg}</p>}
      <p style={{ color: "#999", fontSize: 12, marginTop: 18, textAlign: "center" }}>
        Dica: o cliente fica preenchido depois de registrar — dá pra passar a etiqueta &quot;comprou&quot; do WhatsApp inteira em sequência.
      </p>
    </div>
  );
}
