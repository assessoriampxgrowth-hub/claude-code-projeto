import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { buscarTermometro, montarMensagemRisco } from "@/lib/agentes/risco";
import { cronAutorizado } from "@/lib/cron-auth";

// Termômetro semanal de risco/retenção — Matheus (estratégia/CS) e Adrian (operacional).
const DESTINATARIOS = [
  { nome: "Matheus", telefone: "5564996453506" },
  { nome: "Adrian", telefone: "5564999350869" },
];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultado = await buscarTermometro();
  const mensagem = montarMensagemRisco(resultado);

  const envios: { nome: string; status: string }[] = [];
  for (const dest of DESTINATARIOS) {
    const envio = await sendWhatsAppText(dest.telefone, mensagem);
    envios.push({ nome: dest.nome, status: envio.success ? "enviado" : `erro: ${envio.error}` });
  }

  return NextResponse.json({
    monitorados: resultado.grupos.length,
    frios: resultado.grupos.filter((g) => g.nivel === "frio").map((g) => g.cliente),
    mornos: resultado.grupos.filter((g) => g.nivel === "morno").map((g) => g.cliente),
    semGrupo: resultado.clientesSemGrupo,
    envios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
