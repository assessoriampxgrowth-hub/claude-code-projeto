import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { syncClient } from "@/lib/reports/generate";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await syncClient(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
