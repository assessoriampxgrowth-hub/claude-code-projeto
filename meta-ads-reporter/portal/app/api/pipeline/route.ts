import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function ok(req: NextRequest, chave?: string) {
  const s = process.env.CRON_SECRET;
  return !!s && chave === s;
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!ok(req, b.chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  if (!b.nome) return NextResponse.json({ error: "Informe o nome do lead" }, { status: 400 });
  const lead = await db.commercialLead.create({
    data: {
      nome: String(b.nome).trim(),
      contato: b.contato ? String(b.contato).trim() : null,
      origem: b.origem ? String(b.origem).trim() : null,
      segmento: b.segmento ? String(b.segmento).trim() : null,
      status: b.status ? String(b.status) : "novo",
      valorProposta: b.valorProposta ? Number(b.valorProposta) : null,
      proximoFollowup: b.proximoFollowup ? new Date(`${b.proximoFollowup}T12:00:00`) : null,
      nota: b.nota ? String(b.nota).trim() : null,
      responsavel: b.responsavel ? String(b.responsavel).trim() : null,
    },
  });
  return NextResponse.json({ ok: true, id: lead.id });
}

export async function GET(req: NextRequest) {
  const chave = req.nextUrl.searchParams.get("chave") ?? undefined;
  if (!ok(req, chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  const leads = await db.commercialLead.findMany({
    where: { status: { notIn: ["fechado", "perdido"] } },
    orderBy: { proximoFollowup: "asc" },
    take: 100,
  });
  return NextResponse.json({ leads });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!ok(req, b.chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  if (!b.id) return NextResponse.json({ error: "Informe id" }, { status: 400 });
  const lead = await db.commercialLead.update({
    where: { id: String(b.id) },
    data: {
      ...(b.status ? { status: String(b.status) } : {}),
      ...(b.proximoFollowup ? { proximoFollowup: new Date(`${b.proximoFollowup}T12:00:00`) } : {}),
      ...(b.nota ? { nota: String(b.nota).trim() } : {}),
    },
  });
  return NextResponse.json({ ok: true, id: lead.id });
}
