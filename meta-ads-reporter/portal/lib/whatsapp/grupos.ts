// Resolve o grupo de WhatsApp "MPX - <cliente>" pelo nome do cliente.
// Usado pelo envio direto de relatórios ao grupo (Fase 2, liberação
// cliente a cliente — decisão do Matheus em 09/07/2026).

const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export async function buscarGrupoDoCliente(nomeCliente: string): Promise<string | null> {
  const res = await fetch(
    `${EVO_URL}/group/fetchAllGroups/${EVO_INSTANCE}?getParticipants=false`,
    { headers: { apikey: EVO_KEY } }
  );
  if (!res.ok) return null;
  const grupos = (await res.json()) as { id: string; subject?: string }[];
  const alvo = normalizar(nomeCliente);

  for (const g of grupos) {
    const subject = (g.subject ?? "").trim();
    if (!/^mpx\s*-/i.test(subject)) continue;
    const nomeGrupo = normalizar(subject.replace(/^mpx\s*-\s*/i, ""));
    if (nomeGrupo.includes(alvo) || alvo.includes(nomeGrupo)) return g.id;
  }
  return null;
}
