import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { pedidosDeDepoimento, montarMensagemProvaSocial } from "@/lib/agentes/prova-social";
import { cronAutorizado } from "@/lib/cron-auth";

const DESTINATARIOS = ["5564996453506", "5564999350869"];
export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pedidos = await pedidosDeDepoimento();
  const msg = montarMensagemProvaSocial(pedidos);
  const envios: string[] = [];
  for (const tel of DESTINATARIOS) { const e = await sendWhatsAppText(tel, msg); envios.push(e.success ? "enviado" : `erro: ${e.error}`); }
  return NextResponse.json({ pedidos: pedidos.map(p=>p.cliente), envios });
}
export async function GET(req: NextRequest){ return executar(req); }
export async function POST(req: NextRequest){ return executar(req); }
