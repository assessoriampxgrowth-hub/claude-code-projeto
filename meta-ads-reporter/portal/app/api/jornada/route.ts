import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { jornadaParaCliente, jornadaInterna, Plano } from "@/lib/agentes/jornada-cliente";
import { cronAutorizado } from "@/lib/cron-auth";

// Gera a jornada de entrega de um cliente novo e manda no WhatsApp do Matheus:
// versão do cliente (pra encaminhar/apresentar) + versão interna (tarefas datadas).
// Uso: /api/jornada?cliente=Nome&entrada=2026-07-14&plano=profissional
const MATHEUS_WHATSAPP = "5564996453506";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cliente = req.nextUrl.searchParams.get("cliente");
  if (!cliente) return NextResponse.json({ error: "informe ?cliente=" }, { status: 400 });

  const entradaStr = req.nextUrl.searchParams.get("entrada");
  const entrada = entradaStr ? new Date(`${entradaStr}T12:00:00`) : new Date();
  const plano = (req.nextUrl.searchParams.get("plano") ?? "essencial") as Plano;

  const paraCliente = jornadaParaCliente(cliente, entrada, plano);
  const interna = jornadaInterna(cliente, entrada, plano);

  const e1 = await sendWhatsAppText(MATHEUS_WHATSAPP, paraCliente);
  const e2 = await sendWhatsAppText(MATHEUS_WHATSAPP, interna);

  return NextResponse.json({
    cliente,
    entrada: entrada.toISOString().slice(0, 10),
    plano,
    envios: { cliente: e1.success, interna: e2.success },
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
