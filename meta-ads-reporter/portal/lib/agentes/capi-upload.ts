// ROBÔ DE ENVIO CAPI — pega as conversões registradas (/conversao) ainda não
// enviadas, criptografa o telefone (SHA-256, padrão Meta) e manda pro pixel
// de cada cliente via Conversions API. O Meta casa o telefone com a pessoa e
// atribui ao anúncio que ela clicou. Roda em dias úteis via orchestrator.
//
// Eventos: comprou -> Purchase (com valor/BRL) | agendou -> Schedule.
// "desqualificado" NÃO vai pro Meta (fica só no nosso banco pra análise).
// Dedup: event_id = id do registro (reenvio não duplica no Meta).

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/security/crypto";

const BASE = "https://graph.facebook.com/v19.0";

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Telefone BR -> E.164 dígitos (55 + DDD + número) -> SHA-256 (padrão Meta).
export function hashTelefone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d; // sem código do país
  return createHash("sha256").update(d).digest("hex");
}

const EVENTO_META: Record<string, string> = {
  comprou: "Purchase",
  agendou: "Schedule",
};

export type ResultadoCapi = {
  enviados: number;
  falhas: number;
  semPixel: string[]; // clientes com conversões mas sem pixel cadastrado
  porCliente: { cliente: string; eventos: number; status: string }[];
};

export async function enviarConversoesPendentes(): Promise<ResultadoCapi> {
  const pendentes = await db.clientConversion.findMany({
    where: { enviadoEm: null, evento: { in: ["comprou", "agendou"] } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const pixels = await db.clientPixel.findMany();
  const resultado: ResultadoCapi = { enviados: 0, falhas: 0, semPixel: [], porCliente: [] };
  if (!pendentes.length) return resultado;

  // Agrupa por cliente.
  const grupos = new Map<string, typeof pendentes>();
  for (const p of pendentes) {
    const g = grupos.get(p.clienteNome) ?? [];
    g.push(p);
    grupos.set(p.clienteNome, g);
  }

  for (const [cliente, registros] of grupos) {
    const pixel = pixels.find(
      (px) => norm(px.clienteNome).includes(norm(cliente).slice(0, 8)) || norm(cliente).includes(norm(px.clienteNome).slice(0, 8))
    );
    if (!pixel) {
      resultado.semPixel.push(cliente);
      continue;
    }

    let token: string;
    try {
      token = decrypt(pixel.capiToken);
    } catch {
      resultado.porCliente.push({ cliente, eventos: registros.length, status: "token ilegível" });
      continue;
    }

    const data = registros.map((r) => ({
      event_name: EVENTO_META[r.evento],
      event_time: Math.floor(r.createdAt.getTime() / 1000),
      event_id: r.id,
      action_source: "chat",
      user_data: { ph: [hashTelefone(r.telefone)] },
      ...(r.evento === "comprou"
        ? { custom_data: { currency: "BRL", value: r.valor ?? 0 } }
        : {}),
    }));

    try {
      const res = await fetch(`${BASE}/${pixel.pixelId}/events?access_token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();

      if (res.ok && json.events_received) {
        const agora = new Date();
        await db.clientConversion.updateMany({
          where: { id: { in: registros.map((r) => r.id) } },
          data: { enviadoEm: agora, erroEnvio: null },
        });
        resultado.enviados += registros.length;
        resultado.porCliente.push({ cliente, eventos: registros.length, status: "enviado" });
      } else {
        const erro = (json?.error?.message as string) ?? `HTTP ${res.status}`;
        await db.clientConversion.updateMany({
          where: { id: { in: registros.map((r) => r.id) } },
          data: { erroEnvio: erro.slice(0, 200) },
        });
        resultado.falhas += registros.length;
        resultado.porCliente.push({ cliente, eventos: registros.length, status: `erro: ${erro.slice(0, 60)}` });
      }
    } catch (e) {
      resultado.falhas += registros.length;
      resultado.porCliente.push({
        cliente,
        eventos: registros.length,
        status: `erro: ${e instanceof Error ? e.message.slice(0, 60) : String(e)}`,
      });
    }
  }

  return resultado;
}

export function montarResumoCapi(r: ResultadoCapi): string | null {
  if (!r.enviados && !r.falhas && !r.semPixel.length) return null; // nada a reportar
  const partes: string[] = [`🎯 *Conversões enviadas pro Meta (CAPI)*`];
  if (r.porCliente.length) {
    partes.push(r.porCliente.map((c) => `• ${c.cliente}: ${c.eventos} evento(s) — ${c.status}`).join("\n"));
  }
  if (r.semPixel.length) {
    partes.push(
      `⚠️ *Com conversão registrada mas SEM pixel cadastrado:* ${r.semPixel.join(", ")}\n_Cadastrar o pixel desses (2 min) pra não perder os eventos._`
    );
  }
  partes.push(`_Cada evento vira aprendizado da campanha + público de compradores._`);
  return partes.join("\n\n");
}
