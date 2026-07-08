import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { alertasSazonais, montarMensagemSazonalidade } from "@/lib/agentes/sazonalidade";
import { cronAutorizado } from "@/lib/cron-auth";

// Radar semanal de datas comerciais — vai pro Matheus (estratégia) e pro
// Adrian (operacional/tráfego), que puxam as campanhas sazonais.
const DESTINATARIOS = [
  { nome: "Matheus", telefone: "5564996453506" },
  { nome: "Adrian", telefone: "5564999350869" },
];

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alertas = alertasSazonais();
  const mensagem = montarMensagemSazonalidade();

  const envios: { nome: string; status: string }[] = [];
  for (const dest of DESTINATARIOS) {
    const envio = await sendWhatsAppText(dest.telefone, mensagem);
    envios.push({ nome: dest.nome, status: envio.success ? "enviado" : `erro: ${envio.error}` });
  }

  return NextResponse.json({
    datasNoRadar: alertas.map((a) => ({
      nome: a.nome,
      data: a.data.toISOString().slice(0, 10),
      diasRestantes: a.diasRestantes,
      urgente: a.urgente,
      clientes: a.clientes.length,
    })),
    envios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
