import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { varrerSaldos, montarMensagemSaldo } from "@/lib/agentes/saldo";
import { cronAutorizado } from "@/lib/cron-auth";

// Vigia diário de saldo/contas Meta Ads — Matheus (financeiro/estratégia)
// e Adrian (tráfego), que cobram a aplicação de saldo dos clientes.
const DESTINATARIOS = [
  { nome: "Matheus", telefone: "5564996453506" },
  { nome: "Adrian", telefone: "5564999350869" },
];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultados = await varrerSaldos();
  const mensagem = montarMensagemSaldo(resultados);

  const envios: { nome: string; status: string }[] = [];
  for (const dest of DESTINATARIOS) {
    const envio = await sendWhatsAppText(dest.telefone, mensagem);
    envios.push({ nome: dest.nome, status: envio.success ? "enviado" : `erro: ${envio.error}` });
  }

  return NextResponse.json({
    contas: resultados.length,
    criticos: resultados.filter((r) => r.status === "critico").map((r) => r.cliente),
    atencao: resultados.filter((r) => r.status === "atencao").map((r) => r.cliente),
    semAcesso: resultados.filter((r) => r.status === "sem_acesso").length,
    envios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
