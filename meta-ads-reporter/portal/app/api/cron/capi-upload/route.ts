import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { enviarConversoesPendentes, montarResumoCapi } from "@/lib/agentes/capi-upload";
import { cronAutorizado } from "@/lib/cron-auth";

const MATHEUS = "5564996453506";
export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await enviarConversoesPendentes();
  const resumo = montarResumoCapi(r);
  if (resumo) await sendWhatsAppText(MATHEUS, resumo);
  return NextResponse.json(r);
}
export async function GET(req: NextRequest){ return executar(req); }
export async function POST(req: NextRequest){ return executar(req); }
