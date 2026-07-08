import { NextRequest } from "next/server";

// O agendador da Vercel chama os crons com GET e manda o segredo como
// "Authorization: Bearer <CRON_SECRET>". Disparo manual usa x-cron-secret
// ou ?secret=. Aceitar os dois formatos.
export function cronAutorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const manual = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  return manual === secret;
}
