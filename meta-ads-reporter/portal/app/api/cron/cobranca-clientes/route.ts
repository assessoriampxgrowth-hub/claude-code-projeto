import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { montarMensagemCobrancaClientes } from "@/lib/agentes/cobranca-clientes";
import { hojeBrasilia } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

// Cobrança de clientes (seg-sex 8h30 BRT): vencimentos de hoje/amanhã +
// devedores às segundas. Vai pro Matheus (financeiro é dele).
const MATHEUS_WHATSAPP = "5564996453506";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mensagem = await montarMensagemCobrancaClientes(hojeBrasilia());
  if (!mensagem) {
    return NextResponse.json({ status: "sem_vencimentos_hoje" });
  }

  const envio = await sendWhatsAppText(MATHEUS_WHATSAPP, mensagem);
  return NextResponse.json({ status: envio.success ? "enviado" : `erro: ${envio.error}` });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
