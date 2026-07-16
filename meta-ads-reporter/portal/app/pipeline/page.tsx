"use client";

import { useState } from "react";

// Mini-CRM comercial: o time registra lead/proposta com status e próximo
// follow-up. Alimenta o Agente de Follow-up (cobra na hora certa).
export default function PipelinePage() {
  const [form, setForm] = useState({
    chave: "",
    responsavel: "",
    nome: "",
    contato: "",
    origem: "",
    segmento: "",
    status: "novo",
    valorProposta: "",
    proximoFollowup: "",
    nota: "",
  });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function enviar() {
    setMsg("Enviando...");
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    if (res.ok) {
      setOk(true);
      setMsg("Lead registrado! ✅");
      setForm({ ...form, nome: "", contato: "", origem: "", segmento: "", valorProposta: "", proximoFollowup: "", nota: "" });
    } else {
      setOk(false);
      setMsg(j.error ?? "Erro");
    }
  }

  const input: React.CSSProperties = { width: "100%", padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ccc", marginTop: 4, boxSizing: "border-box" };
  const label: React.CSSProperties = { display: "block", marginTop: 14, fontWeight: 600, fontSize: 14 };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "24px 18px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>💼 Pipeline Comercial</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>Registre leads e propostas. O robô cobra o follow-up na hora certa pra nenhuma proposta morrer esquecida.</p>

      <label style={label}>Chave de acesso</label>
      <input style={input} type="password" value={form.chave} onChange={set("chave")} placeholder="chave do time" />

      <label style={label}>Seu nome</label>
      <input style={input} value={form.responsavel} onChange={set("responsavel")} placeholder="ex: Matheus" />

      <label style={label}>Nome do lead / empresa *</label>
      <input style={input} value={form.nome} onChange={set("nome")} placeholder="ex: Loja do João" />

      <label style={label}>Contato</label>
      <input style={input} value={form.contato} onChange={set("contato")} placeholder="WhatsApp / nome" />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Origem</label>
          <input style={input} value={form.origem} onChange={set("origem")} placeholder="indicação/anúncio" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={label}>Segmento</label>
          <input style={input} value={form.segmento} onChange={set("segmento")} placeholder="pizzaria..." />
        </div>
      </div>

      <label style={label}>Etapa</label>
      <select style={input} value={form.status} onChange={set("status")}>
        <option value="novo">Novo lead</option>
        <option value="reuniao">Reunião marcada</option>
        <option value="proposta">Proposta enviada</option>
        <option value="negociacao">Em negociação</option>
        <option value="fechado">Fechado ✅</option>
        <option value="perdido">Perdido ❌</option>
      </select>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Valor proposta</label>
          <input style={input} type="number" value={form.valorProposta} onChange={set("valorProposta")} placeholder="R$" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={label}>Próximo follow-up</label>
          <input style={input} type="date" value={form.proximoFollowup} onChange={set("proximoFollowup")} />
        </div>
      </div>

      <label style={label}>Observação</label>
      <textarea style={{ ...input, minHeight: 60 }} value={form.nota} onChange={set("nota")} placeholder="onde parou a conversa" />

      <button onClick={enviar} style={{ width: "100%", marginTop: 20, padding: 14, fontSize: 16, fontWeight: 700, color: "#fff", background: "#111", border: "none", borderRadius: 8, cursor: "pointer" }}>
        Registrar lead
      </button>
      {msg && <p style={{ marginTop: 14, textAlign: "center", color: ok ? "#0a0" : "#c00", fontWeight: 600 }}>{msg}</p>}
    </div>
  );
}
