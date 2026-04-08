import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncClient } from "@/lib/reports/generate";

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientIds: string[] | undefined = body.clientIds;

  const where = clientIds?.length
    ? { id: { in: clientIds }, active: true }
    : { active: true };

  const clients = await db.client.findMany({
    where,
    include: { adAccounts: { where: { active: true } } },
    orderBy: { name: "asc" },
  });

  const results: { id: string; name: string; status: string; error?: string }[] = [];

  for (const client of clients) {
    if (!client.adAccounts.length) {
      results.push({ id: client.id, name: client.name, status: "skip", error: "Sem conta de anúncio" });
      continue;
    }

    const r = await syncClient(client.id);
    results.push({
      id: client.id,
      name: client.name,
      status: r.success ? "ok" : "error",
      error: r.error,
    });
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ total: clients.length, ok, errors, results });
}
