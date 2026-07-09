import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { gerarRelatorios } from "@/lib/agentes/relatorio-criativos";
import { cronAutorizado } from "@/lib/cron-auth";

// Relatório de criativos por cliente, 2x/semana (seg e qui). Vai no privado
// do Matheus e do Adrian, um por cliente, pronto pra encaminhar no grupo.
const DESTINATARIOS = ["5564996453506", "5564999350869"];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relatorios = await gerarRelatorios();
  const prontos = relatorios.filter((r) => r.ok && r.mensagem);
  const semMovimento = relatorios.filter((r) => r.ok && !r.mensagem).length;
  const semAcesso = relatorios.filter((r) => !r.ok).length;

  let enviados = 0;
  for (const rel of prontos) {
    for (const tel of DESTINATARIOS) {
      const envio = await sendWhatsAppText(tel, rel.mensagem!);
      if (envio.success) enviados++;
    }
  }

  // Cabeçalho-resumo pro Matheus saber o que chegou.
  const resumo =
    `📬 *Relatórios de criativos gerados:* ${prontos.length} cliente(s) com movimento na semana.` +
    (semMovimento ? `\n💤 Sem gasto na janela: ${semMovimento}.` : "") +
    (semAcesso ? `\n⚪ Sem acesso (aguardando token Meta): ${semAcesso}.` : "") +
    (prontos.length ? `\n\nÉ só encaminhar cada um no grupo do cliente. 👆` : "");
  await sendWhatsAppText(DESTINATARIOS[0], resumo);

  return NextResponse.json({
    clientes: relatorios.length,
    comRelatorio: prontos.length,
    semMovimento,
    semAcesso,
    mensagensEnviadas: enviados,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
