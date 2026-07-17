import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { avisosRenovacao, montarMensagemRenovacao } from "@/lib/agentes/renovacao";
import { hojeBrasilia } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

const DESTINATARIOS = ["5564996453506", "5564999350869"];

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const avisos = await avisosRenovacao(hojeBrasilia());
  const msg = montarMensagemRenovacao(avisos);
  if (!msg) return NextResponse.json({ status: "sem_marcos_esta_semana", avisos: 0 });
  const envios: string[] = [];
  for (const tel of DESTINATARIOS) { const e = await sendWhatsAppText(tel, msg); envios.push(e.success ? "enviado" : `erro`); }
  return NextResponse.json({ avisos: avisos.map(a => `${a.cliente} (${a.tipo})`), envios });
}
export async function GET(req: NextRequest){ return executar(req); }
export async function POST(req: NextRequest){ return executar(req); }
