import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { raioXRetencao, montarMensagemRetencao } from "@/lib/agentes/retencao";
import { cronAutorizado } from "@/lib/cron-auth";

// Agente CS / Raio-X de Retenção — semanal (segunda, via orchestrator).
// Consolida grupo frio + saldo/campanha + pagamento numa nota de saúde por
// cliente. Vai pro Matheus e Adrian.
const DESTINATARIOS = ["5564996453506", "5564999350869"];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultado = await raioXRetencao();
  const mensagem = montarMensagemRetencao(resultado);

  const envios: { nome: string; status: string }[] = [];
  for (const tel of DESTINATARIOS) {
    const envio = await sendWhatsAppText(tel, mensagem);
    envios.push({ nome: tel, status: envio.success ? "enviado" : `erro: ${envio.error}` });
  }

  return NextResponse.json({
    clientes: resultado.clientes.length,
    emRisco: resultado.clientes.filter((c) => c.score < 50).map((c) => ({ cliente: c.cliente, score: c.score })),
    atencao: resultado.clientes.filter((c) => c.score >= 50 && c.score < 75).length,
    envios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
