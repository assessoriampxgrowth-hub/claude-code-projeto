import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendReportMessage } from "@/lib/whatsapp/send";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const snapshotId: string | undefined = body.snapshotId;

  const client = await db.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (!client.whatsappPhone) return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 });

  let snapshot;
  if (snapshotId) {
    snapshot = await db.reportSnapshot.findUnique({ where: { id: snapshotId } });
  } else {
    snapshot = await db.reportSnapshot.findFirst({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!snapshot) return NextResponse.json({ error: "Nenhum relatório encontrado" }, { status: 404 });

  const data = snapshot.data as { period: { start: string; end: string } };
  const period = `${data.period.start} → ${data.period.end}`;
  const reportUrl = `${process.env.CLIENT_PORTAL_URL}/r/${snapshot.token}`;

  const result = await sendReportMessage(
    id,
    client.whatsappPhone,
    client.name,
    period,
    reportUrl,
    snapshot.id
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
