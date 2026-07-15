import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Canal de feedback comercial: o time registra "criativo X do cliente Y
// fechou N vendas / N agendamentos". Alimenta o Agente de Validação de
// Criativos com o sinal de negócio que não dá pra capturar automático.
// Gate simples por chave (CRON_SECRET) — ferramenta interna.

function autorizado(req: NextRequest, chave?: string): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && chave === secret;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!autorizado(req, body.chave)) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  }
  if (!body.clienteNome || !body.criativoNome) {
    return NextResponse.json({ error: "Informe cliente e criativo" }, { status: 400 });
  }

  const registro = await db.commercialFeedback.create({
    data: {
      clienteNome: String(body.clienteNome).trim(),
      criativoNome: String(body.criativoNome).trim(),
      vendas: Number(body.vendas) || 0,
      agendamentos: Number(body.agendamentos) || 0,
      ticketMedio: body.ticketMedio ? Number(body.ticketMedio) : null,
      nota: body.nota ? String(body.nota).trim() : null,
      autor: body.autor ? String(body.autor).trim() : null,
    },
  });
  return NextResponse.json({ ok: true, id: registro.id });
}

export async function GET(req: NextRequest) {
  const chave = req.nextUrl.searchParams.get("chave") ?? undefined;
  if (!autorizado(req, chave)) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  }
  const registros = await db.commercialFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ registros });
}
