import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { varrerEntrega, montarMensagemEntrega } from "@/lib/agentes/entrega";
import { cronAutorizado } from "@/lib/cron-auth";

// Vigia diário de entrega — anúncio reprovado e campanha ativa sem anúncio
// rodando. Vai pro Adrian (que corrige) e pro Matheus (que responde ao cliente).
const DESTINATARIOS = [
  { nome: "Matheus", telefone: "5564996453506" },
  { nome: "Adrian", telefone: "5564999350869" },
];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultados = await varrerEntrega();
  const mensagem = montarMensagemEntrega(resultados);

  if (!mensagem) {
    return NextResponse.json({ status: "sem_problema", contas: resultados.length });
  }

  const envios: { nome: string; status: string }[] = [];
  for (const dest of DESTINATARIOS) {
    const envio = await sendWhatsAppText(dest.telefone, mensagem);
    envios.push({ nome: dest.nome, status: envio.success ? "enviado" : `erro: ${envio.error}` });
  }

  return NextResponse.json({
    contas: resultados.length,
    criticos: resultados.filter((r) => r.status === "critico").map((r) => r.cliente),
    atencao: resultados.filter((r) => r.status === "atencao").map((r) => r.cliente),
    envios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
