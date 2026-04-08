import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendReportMessage } from "@/lib/whatsapp/send";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const client = await db.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (!client.whatsappPhone) return NextResponse.json({ error: "WhatsApp não configurado para este cliente" }, { status: 400 });

  const snapshot = body.snapshotId
    ? await db.reportSnapshot.findUnique({ where: { id: body.snapshotId } })
    : await db.reportSnapshot.findFirst({ where: { clientId: id }, orderBy: { createdAt: "desc" } });

  if (!snapshot) return NextResponse.json({ error: "Nenhum relatório encontrado. Sincronize primeiro." }, { status: 404 });

  const data = JSON.parse(snapshot.data) as { period: { start: string; end: string } };
  const period = `${data.period.start} → ${data.period.end}`;
  const reportUrl = `${process.env.CLIENT_PORTAL_URL ?? "http://localhost:3000"}/r/${snapshot.token}`;

  const result = await sendReportMessage(id, client.whatsappPhone, client.name, period, reportUrl, snapshot.id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
