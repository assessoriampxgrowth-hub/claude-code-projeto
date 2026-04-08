import { decrypt } from "@/lib/security/crypto";
import { normalizeCampaign, buildTotals, ReportData } from "./normalize";

const META_API_VERSION = "v19.0";
const BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const FIELDS = [
  "campaign_id",
  "campaign_name",
  "objective",
  "effective_status",
  "impressions",
  "clicks",
  "spend",
  "ctr",
  "cpc",
  "reach",
  "frequency",
  "actions",
  "cost_per_action_type",
].join(",");

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchInsights(
  encryptedToken: string,
  accountId: string,
  accountName: string,
  days: number = 7
): Promise<ReportData> {
  const token = decrypt(encryptedToken);

  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const params = new URLSearchParams({
    time_range: JSON.stringify({ since: fmt(start), until: fmt(end) }),
    level: "campaign",
    limit: "100",
    fields: FIELDS,
    access_token: token,
  });

  let allCampaigns: Record<string, unknown>[] = [];
  let url: string | null = `${BASE}/${accountId}/insights?${params}`;

  while (url) {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json = await res.json();

    if (!res.ok) {
      const msg = (json?.error?.message as string) ?? "Meta API error";
      if (msg.includes("expired") || msg.includes("Session")) {
        throw new Error("TOKEN_EXPIRED");
      }
      throw new Error(msg);
    }

    allCampaigns = allCampaigns.concat(json.data ?? []);
    url = json.paging?.next ?? null;
  }

  const campaigns = allCampaigns.map(normalizeCampaign);
  const totals = buildTotals(campaigns);

  return {
    period: { start: fmt(start), end: fmt(end) },
    adAccountId: accountId,
    adAccountName: accountName,
    campaigns,
    totals,
    syncedAt: new Date().toISOString(),
  };
}
