import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncClient } from "@/lib/reports/generate";
import { sendReportMessage } from "@/lib/whatsapp/send";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await db.client.findMany({
    where: { active: true, autoSend: true },
    include: { adAccounts: { where: { active: true } } },
  });

  const results: { id: string; name: string; status: string; error?: string }[] = [];

  for (const client of clients) {
    if (!client.adAccounts.length) {
      results.push({ id: client.id, name: client.name, status: "skip", error: "Sem conta de anúncio" });
      continue;
    }

    const syncResult = await syncClient(client.id);
    if (!syncResult.success) {
      results.push({ id: client.id, name: client.name, status: "error", error: syncResult.error });
      continue;
    }

    if (client.whatsappPhone && syncResult.snapshotId) {
      const snapshot = await db.reportSnapshot.findUnique({ where: { id: syncResult.snapshotId } });
      if (snapshot) {
        const data = snapshot.data as { period: { start: string; end: string } };
        const period = `${data.period.start} → ${data.period.end}`;
        const reportUrl = `${process.env.CLIENT_PORTAL_URL}/r/${snapshot.token}`;
        await sendReportMessage(client.id, client.whatsappPhone, client.name, period, reportUrl, snapshot.id);
      }
    }

    results.push({ id: client.id, name: client.name, status: "ok" });
  }

  return NextResponse.json({ processed: results.length, results });
}
