import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/security/crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      adAccounts: true,
      reportSnapshots: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, periodStart: true, periodEnd: true, token: true, pdfUrl: true, createdAt: true } },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const { name, whatsappPhone, scheduleDay, scheduleHour, autoSend, active, accessToken, adAccountId, adAccountName } = body;

  await db.client.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(whatsappPhone !== undefined && { whatsappPhone }),
      ...(scheduleDay !== undefined && { scheduleDay }),
      ...(scheduleHour !== undefined && { scheduleHour }),
      ...(autoSend !== undefined && { autoSend }),
      ...(active !== undefined && { active }),
    },
  });

  if (accessToken) {
    const accounts = await db.adAccount.findMany({ where: { clientId: id, active: true } });
    if (accounts.length > 0) {
      await db.adAccount.update({
        where: { id: accounts[0].id },
        data: {
          accessToken: encrypt(accessToken),
          tokenStatus: "active",
          ...(adAccountId && { accountId: adAccountId }),
          ...(adAccountName && { accountName: adAccountName }),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
