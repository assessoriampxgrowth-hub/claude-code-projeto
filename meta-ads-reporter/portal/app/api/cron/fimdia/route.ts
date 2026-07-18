import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { buscarAtaDoDia } from "@/lib/clickup/ata";
import { montarResumoFimDeDia } from "@/lib/clickup/priorizacao";
import { cronAutorizado } from "@/lib/cron-auth";

// Fechamento do dia (18h BRT, seg-sex): relê a ata de hoje e manda pro
// Matheus o placar de cada um — concluídas, críticas abertas, risco de
// churn, aguardando cliente e o que cobrar amanhã.
const MATHEUS_WHATSAPP = "5564996453506";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let resumo: string;
  try {
    const ata = await buscarAtaDoDia();
    if (ata.erro) {
      resumo = `🌙 Fechamento do dia: ${ata.erro}.`;
    } else {
      resumo = montarResumoFimDeDia(
        ata.pessoas.map((p) => ({
          nome: p.nome,
          concluidas: p.concluidas,
          pendentes: p.pendentes,
        })),
        ata.paginaNome ?? ""
      );
    }
  } catch (err: unknown) {
    resumo = `🌙 Fechamento do dia falhou: ${err instanceof Error ? err.message : String(err)}`;
  }

  const envio = await sendWhatsAppText(MATHEUS_WHATSAPP, resumo);

  // Prévia da agenda de amanhã, junto com o fechamento do dia.
  try {
    const secret = process.env.CRON_SECRET ?? "";
    const base = process.env.CLIENT_PORTAL_URL ?? "https://portal-alpha-weld.vercel.app";
    await fetch(base + "/api/cron/agenda", { headers: { Authorization: "Bearer " + secret } });
  } catch {}
  return NextResponse.json({ status: envio.success ? "enviado" : `erro: ${envio.error}` });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
