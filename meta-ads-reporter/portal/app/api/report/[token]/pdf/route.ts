import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ReportData } from "@/lib/meta/normalize";
import { generateInsights } from "@/lib/reports/insights-text";
import { ReportPDF } from "@/lib/pdf/document";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const snapshot = await db.reportSnapshot.findUnique({
    where: { token },
    include: { client: { select: { name: true } } },
  });

  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snapshot.data as ReportData;
  const insights = generateInsights(data);
  const generatedAt = new Date().toLocaleString("pt-BR");

  const buffer = await renderToBuffer(
    React.createElement(ReportPDF, {
      data,
      clientName: snapshot.client.name,
      insights,
      generatedAt,
    })
  );

  const filename = `relatorio-${snapshot.client.name.toLowerCase().replace(/\s+/g, "-")}-${data.period.end}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
