import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const clientId = searchParams.get("clientId");

  const logs = await db.syncLog.findMany({
    where: {
      ...(type && { type }),
      ...(clientId && { clientId }),
    },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { client: { select: { name: true } } },
  });

  return NextResponse.json(logs);
}
