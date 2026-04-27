import { db } from "@/lib/db";

const WHATSAPP_URL = process.env.WHATSAPP_API_URL ?? "https://free.uazapi.com";
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN ?? "";

export async function sendReportMessage(
  clientId: string,
  phone: string,
  clientName: string,
  period: string,
  reportUrl: string,
  reportId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message =
    `Olá, *${clientName}*! 👋\n\n` +
    `📊 Seu *relatório semanal do Meta Ads* está pronto!\n` +
    `📅 Período: ${period}\n\n` +
    `👇 Acesse agora:\n${reportUrl}\n\n` +
    `_No link você visualiza os resultados online e pode baixar o PDF completo._`;

  const log = await db.whatsAppLog.create({
    data: { clientId, reportId, phone, status: "pending" },
  });

  try {
    const res = await fetch(`${WHATSAPP_URL}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: WHATSAPP_TOKEN,
      },
      body: JSON.stringify({ phone, message }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = json?.message ?? `HTTP ${res.status}`;
      await db.whatsAppLog.update({
        where: { id: log.id },
        data: { status: "failed", error, sentAt: new Date() },
      });
      return { success: false, error };
    }

    const messageId = String(json?.key?.id ?? json?.id ?? "");
    await db.whatsAppLog.update({
      where: { id: log.id },
      data: { status: "sent", messageId, sentAt: new Date() },
    });

    return { success: true, messageId };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    await db.whatsAppLog.update({
      where: { id: log.id },
      data: { status: "failed", error, sentAt: new Date() },
    });
    return { success: false, error };
  }
}
