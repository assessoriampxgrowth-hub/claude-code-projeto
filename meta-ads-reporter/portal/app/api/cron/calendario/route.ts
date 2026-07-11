import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { montarCalendarioMensal } from "@/lib/agentes/sazonalidade";
import { hojeBrasilia } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

// Calendário comercial do mês (dia 1º, 8h BRT) — Matheus e Adrian; texto
// pronto pra encaminhar aos clientes.
const DESTINATARIOS = ["5564996453506", "5564999350869"];

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mensagem = montarCalendarioMensal(hojeBrasilia());
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
