import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { buscarAtaDoDia, montarMensagemAta } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

// Pauta diária = SOMENTE a Ata do dia (Operacional > Reuniões Diárias > Atas),
// sincronizada com o calendário de Brasília. Decisão do Matheus em 09/07/2026:
// as tarefas soltas do ClickUp foram apagadas e não são mais fonte de pauta.
const MATHEUS_WHATSAPP = "5564996453506";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Se a ata do dia não existir (ninguém criou a página), avisa o Matheus em
  // vez de falhar em silêncio.
  if (ataErro) {
    await sendWhatsAppText(
      MATHEUS_WHATSAPP,
      `⚠️ Pauta do dia não enviada: ${ataErro}. Cria a página da ata de hoje no ClickUp que eu reenvio no próximo ciclo.`
    );
  }

  return NextResponse.json({ ata: ataErro ? { erro: ataErro } : ataEnvios });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
