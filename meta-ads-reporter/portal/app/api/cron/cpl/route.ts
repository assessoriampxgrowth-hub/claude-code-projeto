import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { varrerCpl, montarMensagemCpl } from "@/lib/agentes/cpl";
import { cronAutorizado } from "@/lib/cron-auth";

// CPL diário (ontem, média 7d, pior dia) — Matheus e Adrian.
const DESTINATARIOS = [
  { nome: "Matheus", telefone: "5564996453506" },
  { nome: "Adrian", telefone: "5564999350869" },
];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultados = await varrerCpl();
  const mensagem = montarMensagemCpl(resultados);

  const envios: { nome: string; status: string }[] = [];
  for (const dest of DESTINATARIOS) {
    const envio = await sendWhatsAppText(dest.telefone, mensagem);
    envios.push({ nome: dest.nome, status: envio.success ? "enviado" : `erro: ${envio.error}` });
  }

  return NextResponse.json({
    contas: resultados.length,
    comMovimento: resultados.filter((r) => r.ok && (r.gasto7d ?? 0) > 0).length,
    semAcesso: resultados.filter((r) => !r.ok).length,
    envios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
