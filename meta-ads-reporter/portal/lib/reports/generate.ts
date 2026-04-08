import { db } from "@/lib/db";
import { fetchInsights } from "@/lib/meta/insights";
import { decrypt } from "@/lib/security/crypto";
import { ReportData } from "@/lib/meta/normalize";

export async function syncClient(clientId: string): Promise<{
  success: boolean;
  snapshotId?: string;
  error?: string;
}> {
  const log = await db.syncLog.create({
    data: { clientId, type: "sync", status: "running", message: "Iniciando sincronização" },
  });

  try {
    const client = await db.client.findUniqueOrThrow({
      where: { id: clientId },
      include: { adAccounts: { where: { active: true } } },
    });

    if (!client.adAccounts.length) {
      throw new Error("Nenhuma conta de anúncio ativa");
    }

    const account = client.adAccounts[0];
    let data: ReportData;

    try {
      data = await fetchInsights(
        account.accessToken,
        account.accountId,
        account.accountName ?? account.accountId,
        7
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "TOKEN_EXPIRED") {
        await db.adAccount.update({
          where: { id: account.id },
          data: { tokenStatus: "expired" },
        });
        throw new Error("Token expirado — reconecte a conta de anúncio.");
      }
      await db.adAccount.update({
        where: { id: account.id },
        data: { tokenStatus: "error" },
      });
      throw err;
    }

    await db.adAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), tokenStatus: "active" },
    });

    const periodStart = new Date(data.period.start + "T00:00:00Z");
    const periodEnd = new Date(data.period.end + "T23:59:59Z");

    const snapshot = await db.reportSnapshot.upsert({
      where: {
        token: `${clientId}-${data.period.end}`,
      },
      create: {
        clientId,
        adAccountId: account.id,
        periodStart,
        periodEnd,
        periodType: "weekly",
        data: data as object,
        token: `${clientId}-${data.period.end}`,
      },
      update: {
        data: data as object,
        adAccountId: account.id,
      },
    });

    await db.syncLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        message: `Sincronização concluída. ${data.campaigns.length} campanha(s).`,
        finishedAt: new Date(),
        details: {
          campaigns: data.campaigns.length,
          spend: data.totals.spend,
          snapshotId: snapshot.id,
        },
      },
    });

    return { success: true, snapshotId: snapshot.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await db.syncLog.update({
      where: { id: log.id },
      data: { status: "error", message, finishedAt: new Date() },
    });
    return { success: false, error: message };
  }
}
