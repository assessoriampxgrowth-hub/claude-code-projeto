import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Registro de conversões dos CLIENTES FINAIS (lead agendou/comprou no
// WhatsApp do cliente). É o passo humano de 20 segundos que alimenta o
// robô de envio pro Meta (CAPI). Gate por chave (CRON_SECRET).

function ok(chave?: string) {
  const s = process.env.CRON_SECRET;
  return !!s && chave === s;
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!ok(b.chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  if (!b.clienteNome || !b.telefone || !b.evento) {
    return NextResponse.json({ error: "Informe cliente, telefone e evento" }, { status: 400 });
  }
  const evento = String(b.evento);
  if (!["agendou", "comprou", "desqualificado"].includes(evento)) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }
  const registro = await db.clientConversion.create({
    data: {
      clienteNome: String(b.clienteNome).trim(),
      telefone: String(b.telefone).replace(/\D/g, ""),
      evento,
      valor: b.valor ? Number(b.valor) : null,
      autor: b.autor ? String(b.autor).trim() : null,
    },
  });
  return NextResponse.json({ ok: true, id: registro.id });
}

export async function GET(req: NextRequest) {
  const chave = req.nextUrl.searchParams.get("chave") ?? undefined;
  if (!ok(chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  const registros = await db.clientConversion.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ registros });
}
