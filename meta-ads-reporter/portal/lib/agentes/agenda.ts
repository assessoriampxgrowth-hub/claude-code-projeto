// AGENTE DE AGENDA — avisa no WhatsApp as reuniões do dia (e as novas que
// foram agendadas). Resolve a dor do Calendly notificar só por e-mail.
//
// Fonte: link secreto iCal do Google Agenda (env GOOGLE_CALENDAR_ICS_URL).
// Como o Calendly grava os agendamentos no Google Agenda, esse único link
// cobre Calendly + reuniões marcadas na mão. Sem OAuth, sem API key.

const ICS_URL = process.env.GOOGLE_CALENDAR_ICS_URL ?? "";

export type Evento = {
  titulo: string;
  inicio: Date;
  fim?: Date;
  local?: string;
  descricao?: string;
  criadoEm?: Date;
  diaInteiro: boolean;
};

// ICS quebra linhas longas continuando com espaço/tab na linha seguinte.
function desdobrar(texto: string): string[] {
  const linhas = texto.split(/\r?\n/);
  const out: string[] = [];
  for (const l of linhas) {
    if ((l.startsWith(" ") || l.startsWith("\t")) && out.length) out[out.length - 1] += l.slice(1);
    else out.push(l);
  }
  return out;
}

function limpar(v: string): string {
  return v
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

// "20260715T140000Z" | "20260715T140000" | "20260715"
function parseDataIcs(valor: string, comTz: boolean): { data: Date; diaInteiro: boolean } | null {
  const v = valor.trim();
  const soData = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (soData) {
    return { data: new Date(Number(soData[1]), Number(soData[2]) - 1, Number(soData[3])), diaInteiro: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const data = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : // Sem Z e sem TZID tratável: assume horário de Brasília (UTC-3).
      new Date(Date.UTC(+y, +mo - 1, +d, +h + (comTz ? 3 : 3), +mi, +s));
  return { data, diaInteiro: false };
}

export async function buscarEventos(): Promise<Evento[]> {
  if (!ICS_URL) return [];
  const res = await fetch(ICS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`iCal ${res.status}`);
  const linhas = desdobrar(await res.text());

  const eventos: Evento[] = [];
  let atual: Partial<Evento> | null = null;

  for (const linha of linhas) {
    if (linha.startsWith("BEGIN:VEVENT")) { atual = {}; continue; }
    if (linha.startsWith("END:VEVENT")) {
      if (atual?.titulo && atual.inicio) eventos.push(atual as Evento);
      atual = null;
      continue;
    }
    if (!atual) continue;

    const sep = linha.indexOf(":");
    if (sep < 0) continue;
    const chaveCompleta = linha.slice(0, sep);
    const valor = linha.slice(sep + 1);
    const chave = chaveCompleta.split(";")[0].toUpperCase();
    const temTz = chaveCompleta.includes("TZID");

    if (chave === "SUMMARY") atual.titulo = limpar(valor);
    else if (chave === "LOCATION") atual.local = limpar(valor);
    else if (chave === "DESCRIPTION") atual.descricao = limpar(valor).slice(0, 300);
    else if (chave === "DTSTART") {
      const p = parseDataIcs(valor, temTz);
      if (p) { atual.inicio = p.data; atual.diaInteiro = p.diaInteiro; }
    } else if (chave === "DTEND") {
      const p = parseDataIcs(valor, temTz);
      if (p) atual.fim = p.data;
    } else if (chave === "CREATED" || chave === "DTSTAMP") {
      const p = parseDataIcs(valor, temTz);
      if (p && !atual.criadoEm) atual.criadoEm = p.data;
    }
  }
  return eventos;
}

const horaBr = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dataBr = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

function mesmoDia(a: Date, b: Date): boolean {
  const f = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return f(a) === f(b);
}

export type ResumoAgenda = { hoje: Evento[]; amanha: Evento[]; novas: Evento[] };

export async function resumoAgenda(agora = new Date()): Promise<ResumoAgenda> {
  const eventos = await buscarEventos();
  const amanhaDate = new Date(agora.getTime() + 86400000);
  const ontem = new Date(agora.getTime() - 86400000);

  const hoje = eventos
    .filter((e) => mesmoDia(e.inicio, agora))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const amanha = eventos
    .filter((e) => mesmoDia(e.inicio, amanhaDate))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  // Agendadas nas últimas 24h (é o "avisa que marcaram reunião").
  const novas = eventos
    .filter((e) => e.criadoEm && e.criadoEm >= ontem && e.inicio >= agora)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  return { hoje, amanha, novas };
}

function linhaEvento(e: Evento): string {
  const quando = e.diaInteiro ? "dia inteiro" : horaBr(e.inicio);
  const onde = e.local ? ` · ${e.local.slice(0, 60)}` : "";
  return `• *${quando}* — ${e.titulo}${onde}`;
}

export function montarMensagemAgenda(r: ResumoAgenda): string | null {
  if (!r.hoje.length && !r.novas.length) return null; // dia sem reunião: não incomoda

  const partes: string[] = [];

  if (r.hoje.length) {
    partes.push(`📅 *SUAS REUNIÕES DE HOJE* (${r.hoje.length})\n\n${r.hoje.map(linhaEvento).join("\n")}`);
  } else {
    partes.push(`📅 *Agenda de hoje:* sem reunião marcada.`);
  }

  if (r.novas.length) {
    partes.push(
      `🆕 *Agendaram com você nas últimas 24h:*\n` +
        r.novas.map((e) => `• ${dataBr(e.inicio)} às ${horaBr(e.inicio)} — ${e.titulo}`).join("\n")
    );
  }

  if (r.amanha.length) {
    partes.push(`⏭️ *Amanhã:* ${r.amanha.map((e) => `${horaBr(e.inicio)} ${e.titulo}`).join(" · ")}`);
  }

  return partes.join("\n\n");
}
