import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { montarBriefSemanal } from "@/lib/agentes/brief-semanal";
import { cronAutorizado } from "@/lib/cron-auth";

const MATHEUS = "5564996453506";
export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const msg = await montarBriefSemanal();
  const e = await sendWhatsAppText(MATHEUS, msg);
  return NextResponse.json({ status: e.success ? "enviado" : `erro: ${e.error}` });
}
export async function GET(req: NextRequest){ return executar(req); }
export async function POST(req: NextRequest){ return executar(req); }
