import { NextRequest, NextResponse } from "next/server";
import { hojeBrasilia } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

// MAESTRO da manhã — contorna o limite de 2 crons/dia do plano Hobby da Vercel.
// Uma vez por dia (7h BRT) dispara todos os agentes que cabem no dia:
// - Dias úteis: pauta da ata, vigia de saldo, CPL, cobrança de clientes
// - Segunda: + sazonalidade, risco/retenção, rodízio de relacionamento,
//   relatório de criativos, token-refresh (semanal já basta)
// - Quinta: + relatório de criativos
// - Dia 1º: + calendário comercial do mês
// Chama cada rota internamente com o CRON_SECRET. O fechamento do dia (fimdia,
// 18h) fica no 2º cron, porque é de fim de expediente.

export const maxDuration = 300;

const BASE = process.env.CLIENT_PORTAL_URL ?? "https://portal-alpha-weld.vercel.app";

async function dispara(path: string, secret: string): Promise<{ rota: string; status: string }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    return { rota: path, status: `${res.status}` };
  } catch (e) {
    return { rota: path, status: `erro: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = process.env.CRON_SECRET ?? "";
  const hoje = hojeBrasilia();
  const diaSemana = hoje.getDay(); // 0=dom, 1=seg ... 6=sáb
  const diaMes = hoje.getDate();
  const ehDiaUtil = diaSemana >= 1 && diaSemana <= 5;

  const rotas: string[] = [];
  if (ehDiaUtil) {
    rotas.push("/api/cron/daily", "/api/cron/saldo", "/api/cron/cpl", "/api/cron/cobranca-clientes", "/api/cron/followup", "/api/cron/capi-upload", "/api/cron/agenda");
  }
  if (diaSemana === 1) {
    rotas.push(
      "/api/cron/sazonalidade",
      "/api/cron/risco",
      "/api/cron/relacionamento",
      "/api/cron/relatorio-criativos",
      "/api/cron/token-refresh",
      "/api/cron/weekly",
      "/api/cron/retencao",
      "/api/cron/escala",
      "/api/cron/prova-social",
      "/api/cron/renovacao"
    );
  }
  if (diaSemana === 4) {
    rotas.push("/api/cron/relatorio-criativos");
  }
  if (diaSemana === 5) {
    rotas.push("/api/cron/brief-semanal");
  }
  if (diaMes === 1) {
    rotas.push("/api/cron/calendario", "/api/cron/validacao-criativos");
  }

  // Executa em sequência pra não estourar limites da Evolution/Meta.
  const resultados = [];
  for (const rota of rotas) {
    resultados.push(await dispara(rota, secret));
  }

  return NextResponse.json({ dia: hoje.toISOString().slice(0, 10), diaSemana, disparados: resultados });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
