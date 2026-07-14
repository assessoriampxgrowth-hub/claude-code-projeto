import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { validarCriativosDeTodos, montarRelatorio } from "@/lib/agentes/validacao-criativos";
import { hojeBrasilia } from "@/lib/clickup/ata";
import { cronAutorizado } from "@/lib/cron-auth";

// Agente de Validação de Criativos — roda mensalmente (dia 1º, via orchestrator).
// Relatório interno por cliente: classifica os criativos do mês em
// 🟢 validado / 🟡 promissor / 🔴 não validado / ⚫ descartado, cruzando mídia
// com o benchmark do segmento. Vai só pro time (Matheus e Adrian).
const DESTINATARIOS = ["5564996453506", "5564999350869"];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dias = Number(req.nextUrl.searchParams.get("dias") ?? 30);
  const soCliente = req.nextUrl.searchParams.get("cliente");

  const hoje = hojeBrasilia();
  const inicio = new Date(hoje.getTime() - dias * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const periodo = `${fmt(inicio)} a ${fmt(hoje)}`;

  let resultados = await validarCriativosDeTodos(dias);
  if (soCliente) {
    const alvo = soCliente.toLowerCase();
    resultados = resultados.filter((r) => r.cliente.toLowerCase().includes(alvo));
  }

  let enviados = 0;
  const resumo: { cliente: string; validados: number; naoValidados: number; cplMedio: string }[] = [];

  for (const r of resultados) {
    const relatorio = montarRelatorio(r, periodo);
    if (!relatorio) continue;
    for (const tel of DESTINATARIOS) {
      const envio = await sendWhatsAppText(tel, relatorio);
      if (envio.success) enviados++;
    }
    resumo.push({
      cliente: r.cliente,
      validados: r.criativos.filter((c) => c.classificacao === "validado").length,
      naoValidados: r.criativos.filter((c) => c.classificacao === "nao_validado").length,
      cplMedio: r.cplMedio !== null ? r.cplMedio.toFixed(2) : "n/d",
    });
  }

  return NextResponse.json({
    periodo,
    clientesAnalisados: resultados.length,
    comRelatorio: resumo.length,
    mensagensEnviadas: enviados,
    resumo,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
