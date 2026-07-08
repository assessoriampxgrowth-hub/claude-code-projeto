import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import {
  buscarTarefasAtrasadas,
  agruparPorResponsavel,
  montarMensagemCobranca,
  montarPautaDiaria,
  RESPONSAVEL_WHATSAPP,
} from "@/lib/clickup/cobranca";
import { buscarAtaDoDia, montarMensagemAta } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

const MATHEUS_WHATSAPP = "5564996453506";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tarefas, listasComErro } = await buscarTarefasAtrasadas();
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

  const pauta = montarPautaDiaria(tarefas, listasComErro);
  const envioPauta = await sendWhatsAppText(MATHEUS_WHATSAPP, pauta);

  // Pauta individual da Ata: checklist do dia de cada pessoa no doc "Atas",
  // priorizado e enviado no WhatsApp de cada um. Falha aqui não derruba o resto.
  const ataEnvios: { nome: string; pendentes: number; status: string }[] = [];
  let ataErro: string | null = null;
  try {
    const ata = await buscarAtaDoDia();
    if (ata.erro) {
      ataErro = ata.erro;
    } else {
      for (const pessoa of ata.pessoas) {
        const mensagem = montarMensagemAta(pessoa, ata.paginaNome ?? "");
        const envio = await sendWhatsAppText(pessoa.telefone, mensagem);
        ataEnvios.push({
          nome: pessoa.nome,
          pendentes: pessoa.pendentes.length,
          status: envio.success ? "enviado" : `erro: ${envio.error}`,
        });
      }
    }
  } catch (err: unknown) {
    ataErro = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    totalAtrasadas: tarefas.length,
    listasComErro,
    cobrancas: cobrancasEnviadas,
    pauta: envioPauta.success ? "enviada" : `erro: ${envioPauta.error}`,
    ata: ataErro ? { erro: ataErro } : ataEnvios,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
