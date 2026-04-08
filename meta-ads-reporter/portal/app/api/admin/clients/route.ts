import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/security/crypto";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    include: {
      adAccounts: { where: { active: true }, select: { id: true, accountId: true, accountName: true, tokenStatus: true, lastSyncAt: true } },
      _count: { select: { reportSnapshots: true } },
    },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, whatsappPhone, scheduleDay, scheduleHour, autoSend, adAccountId, adAccountName, accessToken } = body;

  if (!name || !adAccountId || !accessToken) {
    return NextResponse.json({ error: "name, adAccountId e accessToken são obrigatórios" }, { status: 400 });
  }

  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const client = await db.client.create({
    data: {
      name,
      slug,
      whatsappPhone: whatsappPhone ?? null,
      scheduleDay: scheduleDay ?? "monday",
      scheduleHour: scheduleHour ?? 8,
      autoSend: autoSend ?? true,
      adAccounts: {
        create: {
          accountId: adAccountId,
          accountName: adAccountName ?? adAccountId,
          accessToken: encrypt(accessToken),
        },
      },
    },
    include: { adAccounts: true },
  });

  return NextResponse.json(client, { status: 201 });
}
