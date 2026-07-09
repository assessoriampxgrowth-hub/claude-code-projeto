import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { gerarRelatorios } from "@/lib/agentes/relatorio-criativos";
import { buscarGrupoDoCliente } from "@/lib/whatsapp/grupos";
import { cronAutorizado } from "@/lib/cron-auth";

// Relatório de criativos por cliente, 2x/semana (seg e qui). Vai no privado
// do Matheus e do Adrian, um por cliente, pronto pra encaminhar no grupo.
const DESTINATARIOS = ["5564996453506", "5564999350869"];

// Fase 2 (decisão de 09/07/2026): envio direto no grupo do cliente, liberado
// cliente a cliente DEPOIS de 2-3 semanas validando a precisão no privado.
// Adicionar o nome exato do cliente (como está no portal) pra ativar.
// A cópia interna 🔒 continua indo só pro time, sempre.
const CLIENTES_ENVIO_DIRETO_NO_GRUPO: string[] = [];

export const maxDuration = 300;

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relatorios = await gerarRelatorios();
  const prontos = relatorios.filter((r) => r.ok && r.mensagemCliente);
  const semMovimento = relatorios.filter((r) => r.ok && !r.mensagemCliente).length;
  const semAcesso = relatorios.filter((r) => !r.ok).length;

  let enviados = 0;
  const enviosDiretos: { cliente: string; status: string }[] = [];
  for (const rel of prontos) {
    for (const tel of DESTINATARIOS) {
      // Versão do cliente (pra encaminhar) seguida da leitura interna.
      const envioCliente = await sendWhatsAppText(tel, rel.mensagemCliente!);
      if (envioCliente.success) enviados++;
      if (rel.mensagemInterna) {
        const envioInterno = await sendWhatsAppText(tel, rel.mensagemInterna);
        if (envioInterno.success) enviados++;
      }
    }

    // Fase 2: clientes liberados recebem a versão simples direto no grupo.
    if (CLIENTES_ENVIO_DIRETO_NO_GRUPO.includes(rel.cliente)) {
      const grupoJid = await buscarGrupoDoCliente(rel.cliente);
      if (grupoJid) {
        const envio = await sendWhatsAppText(grupoJid, rel.mensagemCliente!);
        enviosDiretos.push({ cliente: rel.cliente, status: envio.success ? "enviado" : `erro: ${envio.error}` });
      } else {
        enviosDiretos.push({ cliente: rel.cliente, status: "grupo_nao_encontrado" });
      }
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
    enviosDiretosNoGrupo: enviosDiretos,
  });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
