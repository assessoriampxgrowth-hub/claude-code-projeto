import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/security/crypto";
import path from "path";
import fs from "fs";

interface LegacyClient {
  id: string;
  name: string;
  ad_account_id: string;
  whatsapp_recipients?: string[];
  active?: boolean;
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const accessToken: string = body.accessToken;
  let clients: LegacyClient[] = body.clients;

  if (!accessToken) {
    return NextResponse.json({ error: "accessToken é obrigatório" }, { status: 400 });
  }

  // Se não veio clients no body, tenta ler do arquivo local
  if (!clients) {
    const clientsPath = path.join(process.cwd(), "..", "clients.json");
    if (!fs.existsSync(clientsPath)) {
      return NextResponse.json(
        { error: "clients.json não encontrado. Cole o conteúdo do JSON no campo abaixo." },
        { status: 404 }
      );
    }
    clients = JSON.parse(fs.readFileSync(clientsPath, "utf-8"));
  }

  const encryptedToken = encrypt(accessToken);
  const results: { name: string; status: "created" | "skipped" | "error"; error?: string }[] = [];

  for (const c of clients) {
    try {
      const existing = await db.client.findUnique({ where: { slug: c.id } });
      if (existing) {
        results.push({ name: c.name, status: "skipped" });
        continue;
      }

      await db.client.create({
        data: {
          name: c.name,
          slug: c.id,
          active: c.active ?? true,
          whatsappPhone: c.whatsapp_recipients?.[0] ?? null,
          scheduleDay: "monday",
          scheduleHour: 8,
          autoSend: true,
          adAccounts: {
            create: {
              accountId: c.ad_account_id,
              accountName: c.name,
              accessToken: encryptedToken,
              tokenStatus: "active",
            },
          },
        },
      });

      results.push({ name: c.name, status: "created" });
    } catch (err: unknown) {
      results.push({
        name: c.name,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ created, skipped, errors, results });
}
