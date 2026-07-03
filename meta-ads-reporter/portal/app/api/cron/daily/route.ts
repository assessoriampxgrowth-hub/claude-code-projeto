import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import {
  buscarTarefasAtrasadas,
  agruparPorResponsavel,
  montarMensagemCobranca,
  montarPautaDiaria,
  RESPONSAVEL_WHATSAPP,
} from "@/lib/clickup/cobranca";

const MATHEUS_WHATSAPP = "5564996453506";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tarefas = await buscarTarefasAtrasadas();
  const porResponsavel = agruparPorResponsavel(tarefas);

  const cobrancasEnviadas: { assigneeId: number; nome: string; qtde: number; status: string }[] = [];

  for (const [assigneeId, tarefasDoResponsavel] of porResponsavel) {
    const contato = RESPONSAVEL_WHATSAPP[assigneeId];
    if (!contato) {
      cobrancasEnviadas.push({
        assigneeId,
        nome: tarefasDoResponsavel[0].assigneeNome,
        qtde: tarefasDoResponsavel.length,
        status: "sem_whatsapp_cadastrado",
      });
      continue;
    }

    const mensagem = montarMensagemCobranca(contato.nome, tarefasDoResponsavel);
    const envio = await sendWhatsAppText(contato.telefone, mensagem);
    cobrancasEnviadas.push({
      assigneeId,
      nome: contato.nome,
      qtde: tarefasDoResponsavel.length,
      status: envio.success ? "enviado" : `erro: ${envio.error}`,
    });
  }

  const pauta = montarPautaDiaria(tarefas);
  const envioPauta = await sendWhatsAppText(MATHEUS_WHATSAPP, pauta);

  return NextResponse.json({
    totalAtrasadas: tarefas.length,
    cobrancas: cobrancasEnviadas,
    pauta: envioPauta.success ? "enviada" : `erro: ${envioPauta.error}`,
  });
}
