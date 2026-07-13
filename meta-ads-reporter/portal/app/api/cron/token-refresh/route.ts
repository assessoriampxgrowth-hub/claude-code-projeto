import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/security/crypto";
import { sendWhatsAppText } from "@/lib/whatsapp/send";
import { cronAutorizado } from "@/lib/cron-auth";

// Auto-renovação do token do Meta: todo dia checa quanto falta pra expirar;
// se faltar <= 10 dias, tenta estender pra +60 dias via fb_exchange_token
// (app id/secret nas envs). Avisa o Matheus se conseguir renovar OU se o
// token estiver perto de vencer e não der pra renovar sozinho.
const MATHEUS_WHATSAPP = "5564996453506";
const APP_ID = process.env.META_APP_ID ?? "";
const APP_SECRET = process.env.META_APP_SECRET ?? "";

async function executar(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const acc = await db.adAccount.findFirst({ where: { active: true } });
  if (!acc) return NextResponse.json({ status: "sem_contas" });

  let token: string;
  try {
    token = decrypt(acc.accessToken);
  } catch {
    return NextResponse.json({ status: "token_ilegivel" });
  }

  // Quanto falta pra expirar? Se o debug_token ERRAR (ex: app secret errado),
  // NÃO é sinal de token expirado — não alarmar por isso.
  const dbg = await fetch(
    `https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${APP_ID}%7C${APP_SECRET}`
  ).then((r) => r.json());
  if (dbg?.error) {
    return NextResponse.json({ status: "debug_falhou", erro: dbg.error.message });
  }
  const expiresAt = dbg?.data?.expires_at as number | undefined;
  const isValid = dbg?.data?.is_valid as boolean | undefined;
  const diasRestantes = expiresAt ? Math.round((expiresAt * 1000 - Date.now()) / 86400000) : null;

  // Só considera inválido se o Meta confirmou is_valid=false de forma explícita.
  if (isValid === false) {
    // Confirmação dupla: só alarma se o token realmente não responde a uma chamada real.
    const teste = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`).then((r) => r.json());
    if (teste?.error) {
      await sendWhatsAppText(
        MATHEUS_WHATSAPP,
        `🔴 *Token do Meta expirou.* Os relatórios/saldo/CPL vão parar até gerar um novo. Me avisa que te guio (2 min no Graph API Explorer).`
      );
      return NextResponse.json({ status: "token_invalido", diasRestantes });
    }
    return NextResponse.json({ status: "debug_diz_invalido_mas_token_responde" });
  }

  // Token de longa duração (expiresAt = 0 = nunca) ou ainda longe de vencer: nada a fazer.
  if (expiresAt === 0 || (diasRestantes !== null && diasRestantes > 10)) {
    return NextResponse.json({ status: "ok", diasRestantes: expiresAt === 0 ? "nunca" : diasRestantes });
  }

  // Perto de vencer: tenta estender.
  const troca = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${token}`
  ).then((r) => r.json());

  if (troca?.access_token) {
    const novo = encrypt(troca.access_token);
    await db.adAccount.updateMany({ data: { accessToken: novo, tokenStatus: "active" } });
    const novosDias = troca.expires_in ? Math.round(troca.expires_in / 86400) : 60;
    await sendWhatsAppText(
      MATHEUS_WHATSAPP,
      `🟢 Token do Meta renovado automaticamente por +${novosDias} dias. Nada pra você fazer. 👍`
    );
    return NextResponse.json({ status: "renovado", novosDias });
  }

  // Não conseguiu renovar e está perto de vencer: pede ação humana.
  await sendWhatsAppText(
    MATHEUS_WHATSAPP,
    `🟠 O token do Meta vence em ${diasRestantes} dia(s) e não consegui renovar sozinho (erro: ${troca?.error?.message ?? "?"}). Quando puder, me chama que a gente gera um novo em 2 min.`
  );
  return NextResponse.json({ status: "renovacao_falhou", diasRestantes, erro: troca?.error?.message });
}

export async function GET(req: NextRequest) {
  return executar(req);
}

export async function POST(req: NextRequest) {
  return executar(req);
}
