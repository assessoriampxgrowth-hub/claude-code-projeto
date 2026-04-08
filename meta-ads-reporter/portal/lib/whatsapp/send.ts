import { db } from "@/lib/db";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

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
    const res = await fetch(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_KEY,
        },
        body: JSON.stringify({ number: phone, text: message }),
      }
    );

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
