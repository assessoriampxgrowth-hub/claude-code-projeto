"use client";
import { useState } from "react";

export default function ImportarPage() {
  const [token, setToken] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number; skipped: number; errors: number;
    results: { name: string; status: string; error?: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  async function handleImport(useFile: boolean) {
    if (!token) { setError("Cole o Access Token antes de importar."); return; }
    setLoading(true); setError(""); setResult(null);

    const body: Record<string, unknown> = { accessToken: token };
    if (!useFile && jsonText) {
      try { body.clients = JSON.parse(jsonText); }
      catch { setError("JSON inválido."); setLoading(false); return; }
    }

    const res = await fetch("/api/admin/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erro na importação"); return; }
    setResult(data);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid #E4E6EB", fontSize: 14, boxSizing: "border-box",
    background: "#FFF", color: "#1C1E21", outline: "none",
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1C1E21" }}>
          📥 Importar Clientes
        </h1>
        <p style={{ margin: "6px 0 0", color: "#8B8FA8", fontSize: 14 }}>
          Migra os clientes do <code>clients.json</code> Python para o banco de dados.
          Clientes já importados são ignorados automaticamente.
        </p>
      </div>

      <div style={{ background: "#FFF3CD", border: "1px solid #FFCA2C", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
        <strong style={{ color: "#856404" }}>⚠️ Atenção:</strong>
        <span style={{ color: "#856404", fontSize: 13, marginLeft: 6 }}>
          Todos os clientes serão importados com o mesmo Access Token. Depois da importação,
          você pode atualizar o token de cada cliente individualmente em <a href="/admin/clientes" style={{ color: "#856404" }}>Clientes → Editar</a>.
        </span>
      </div>

      <div style={{ background: "#FFF", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>
          1. Access Token do Meta
        </h2>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1C1E21" }}>
          Token com permissão <code>ads_read</code>
        </label>
        <input
          type="password"
          style={inputStyle}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="EAANo..."
        />
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8B8FA8" }}>
          Token atual do .env: termina em <code>...ZDZD</code>
        </p>
      </div>

      <div style={{ background: "#FFF", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>
          2. Origem dos dados
        </h2>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexDirection: "column" }}>
          <button
            onClick={() => handleImport(true)}
            disabled={loading}
            style={{
              padding: "14px 20px", borderRadius: 10, border: "2px solid #1877F2",
              background: "#EEF4FF", color: "#1877F2", fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", textAlign: "left" as const,
            }}
          >
            🗂️ Ler automaticamente do arquivo <code>clients.json</code>
            <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.8 }}>
              Funciona apenas rodando localmente (npm run dev)
            </div>
          </button>
        </div>

        <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#E4E6EB" }} />
          <span style={{ color: "#8B8FA8", fontSize: 12 }}>ou cole o JSON manualmente</span>
          <div style={{ flex: 1, height: 1, background: "#E4E6EB" }} />
        </div>

        <textarea
          style={{ ...inputStyle, height: 160, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`Cole aqui o conteúdo do clients.json:\n[\n  { "id": "cliente-01", "name": "...", "ad_account_id": "act_...", ... }\n]`}
        />
        <button
          onClick={() => handleImport(false)}
          disabled={loading || !jsonText}
          style={{
            marginTop: 12, padding: "12px 24px", borderRadius: 8, border: "none",
            background: loading || !jsonText ? "#D1D5DB" : "#1877F2", color: "#FFF",
            fontSize: 14, fontWeight: 600, cursor: loading || !jsonText ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Importando..." : "Importar JSON colado"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#FFE9EA", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ margin: 0, color: "#FF5A65", fontSize: 14 }}>❌ {error}</p>
        </div>
      )}

      {result && (
        <div style={{ background: "#FFF", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1C1E21" }}>
            Resultado da importação
          </h3>

          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Criados", value: result.created, color: "#00C851" },
              { label: "Já existiam", value: result.skipped, color: "#8B8FA8" },
              { label: "Erros", value: result.errors, color: "#FF5A65" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "#F5F6FA", borderRadius: 10, padding: "14px 20px",
                borderLeft: `4px solid ${s.color}`, flex: 1,
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#8B8FA8", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {result.created > 0 && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: "#E6F9ED", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#00C851", fontWeight: 600 }}>
                ✅ {result.created} cliente(s) importado(s) com sucesso!
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#065F46" }}>
                Agora vá em <a href="/admin/clientes" style={{ color: "#065F46", fontWeight: 600 }}>Clientes</a> e clique em "🔄 Sincronizar" para gerar os primeiros relatórios.
              </p>
            </div>
          )}

          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #F5F6FA" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B8FA8", fontWeight: 600 }}>Cliente</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B8FA8", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F5F6FA" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        color: r.status === "created" ? "#00C851" : r.status === "skipped" ? "#8B8FA8" : "#FF5A65",
                        fontWeight: 600, fontSize: 12,
                      }}>
                        {r.status === "created" ? "✅ Criado" : r.status === "skipped" ? "⏭ Já existe" : `❌ ${r.error}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
