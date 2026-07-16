import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { analisarEscala, montarMensagemEscala } from "@/lib/agentes/escala";
import { cronAutorizado } from "@/lib/cron-auth";

const DESTINATARIOS = ["5564996453506", "5564999350869"];
export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ops = await analisarEscala();
  const msg = montarMensagemEscala(ops);
  const envios: string[] = [];
  for (const tel of DESTINATARIOS) { const e = await sendWhatsAppText(tel, msg); envios.push(e.success ? "enviado" : `erro: ${e.error}`); }
  return NextResponse.json({ contas: ops.length, escalar: ops.filter(o=>o.tipo==="escalar").map(o=>o.cliente), envios });
}
export async function GET(req: NextRequest){ return executar(req); }
export async function POST(req: NextRequest){ return executar(req); }
