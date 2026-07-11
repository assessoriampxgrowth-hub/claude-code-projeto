import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { montarMensagemRelacionamento } from "@/lib/agentes/relacionamento";
import { hojeBrasilia } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

// Rodízio de relacionamento (segunda 9h45 BRT) — Matheus e Adrian.
const DESTINATARIOS = ["5564996453506", "5564999350869"];

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mensagem = await montarMensagemRelacionamento(hojeBrasilia());
  const envios: string[] = [];
  for (const tel of DESTINATARIOS) {
    const envio = await sendWhatsAppText(tel, mensagem);
    envios.push(envio.success ? "enviado" : `erro: ${envio.error}`);
  }
  return NextResponse.json({ envios });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
