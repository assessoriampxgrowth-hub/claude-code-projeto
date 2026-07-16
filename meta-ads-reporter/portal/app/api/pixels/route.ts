import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/security/crypto";

// Cadastro do pixel/dataset + token CAPI de cada cliente (setup único por
// cliente). O robô de envio usa isso pra saber pra onde mandar os eventos.

function ok(chave?: string) {
  const s = process.env.CRON_SECRET;
  return !!s && chave === s;
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!ok(b.chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  if (!b.clienteNome || !b.pixelId || !b.capiToken) {
    return NextResponse.json({ error: "Informe clienteNome, pixelId e capiToken" }, { status: 400 });
  }
  const registro = await db.clientPixel.upsert({
    where: { clienteNome: String(b.clienteNome).trim() },
    update: { pixelId: String(b.pixelId).trim(), capiToken: encrypt(String(b.capiToken).trim()) },
    create: {
      clienteNome: String(b.clienteNome).trim(),
      pixelId: String(b.pixelId).trim(),
      capiToken: encrypt(String(b.capiToken).trim()),
    },
  });
  return NextResponse.json({ ok: true, id: registro.id });
}

export async function GET(req: NextRequest) {
  const chave = req.nextUrl.searchParams.get("chave") ?? undefined;
  if (!ok(chave)) return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  const pixels = await db.clientPixel.findMany({
    select: { clienteNome: true, pixelId: true, updatedAt: true },
    orderBy: { clienteNome: "asc" },
  });
  return NextResponse.json({ pixels });
}
