import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { resumoAgenda, montarMensagemAgenda } from "@/lib/agentes/agenda";
import { cronAutorizado } from "@/lib/cron-auth";

// Agenda do dia — reuniões de hoje + quem agendou nas últimas 24h.
// Roda de manhã (via orchestrator) e de novo no fim do dia (prévia de amanhã).
const MATHEUS = "5564996453506";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await resumoAgenda();
    const msg = montarMensagemAgenda(r);
    if (!msg) return NextResponse.json({ status: "sem_reuniao_hoje" });
    const e = await sendWhatsAppText(MATHEUS, msg);
    return NextResponse.json({
      hoje: r.hoje.length, amanha: r.amanha.length, novas: r.novas.length,
      status: e.success ? "enviado" : `erro: ${e.error}`,
    });
  } catch (err) {
    return NextResponse.json({ status: "erro", detalhe: err instanceof Error ? err.message : String(err) });
  }
}
export async function GET(req: NextRequest){ return executar(req); }
export async function POST(req: NextRequest){ return executar(req); }
