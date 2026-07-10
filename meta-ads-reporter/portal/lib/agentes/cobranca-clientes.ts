// Agente Cobrança de Clientes (Financeiro): avisa quem vence hoje/amanhã e
// lembra os devedores às segundas. Fonte viva: planilha do financeiro no
// Google Sheets (Matheus atualiza; salva em 09/07/2026). Se a planilha não
// responder, cai na lista estática de reserva (foto de jul/2026).

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1OSn28DSBu6jq0Koe2Xcn3YwVQ85JL-R_4RRFvQOHzWA/export?format=csv";

// Colunas da planilha (linha 2 é o cabeçalho real):
const COL_EMPRESA = 2;
const COL_CONTATO = 3;
const COL_FEE = 13;
const COL_SITUACAO = 14;
const COL_PGTO = 16;

type ClientePagamento = { nome: string; dia: number; fee: number };
type Devedor = { nome: string; contato: string; fee: number | null };

export type CarteiraFinanceira = {
  carteira: ClientePagamento[];
  devedores: Devedor[];
  ativosSemDia: string[];
  fonte: "planilha" | "reserva";
};

// Reserva estática (jul/2026) — usada só se a planilha falhar.
const CARTEIRA_RESERVA: ClientePagamento[] = [
  { nome: "Abel", dia: 5, fee: 1000 },
  { nome: "Pavimold", dia: 9, fee: 1133 },
  { nome: "Restaurante Centro Oeste", dia: 15, fee: 1000 },
  { nome: "Agri Manutenção Agrícolas", dia: 15, fee: 1000 },
  { nome: "Toda Chic", dia: 15, fee: 497 },
  { nome: "Outlet Modas", dia: 20, fee: 497 },
  { nome: "Dino Store", dia: 20, fee: 1200 },
  { nome: "Zezinho Ar Condicionado", dia: 20, fee: 797 },
  { nome: "N Laser", dia: 20, fee: 1000 },
  { nome: "Dra. Ana Karoline", dia: 20, fee: 1333 },
  { nome: "Pizzaria Hulligel", dia: 22, fee: 650 },
  { nome: "LC Motors", dia: 22, fee: 1000 },
  { nome: "NutriMais Produtos Naturais", dia: 25, fee: 797 },
  { nome: "Moto Pneus", dia: 25, fee: 797 },
  { nome: "Restaurante Mayara", dia: 25, fee: 497 },
  { nome: "Dom Caetano", dia: 25, fee: 650 },
  { nome: "Revest Envelopamentos", dia: 26, fee: 1333 },
  { nome: "Dicasa", dia: 27, fee: 1000 },
  { nome: "Suzy Cabelereira", dia: 30, fee: 497 },
];
const DEVEDORES_RESERVA: Devedor[] = [
  { nome: "Warlem Vidraçaria", contato: "Warlem", fee: null },
  { nome: "Foco Odontologia", contato: "Lenice", fee: 1000 },
  { nome: "Drogaria Mônica", contato: "Karine", fee: 797 },
  { nome: "GB Auto Center", contato: "Geovana/Gabriel", fee: 997 },
  { nome: "Malice Doces", contato: "Felipe Zarth", fee: 797 },
];

// Parser CSV mínimo com suporte a aspas (fee vem como "R$ 1.000,00").
function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], dentroAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (dentroAspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') dentroAspas = false;
      else campo += ch;
    } else if (ch === '"') dentroAspas = true;
    else if (ch === ",") { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); campo = ""; linha = [];
    } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

function parseFee(s: string): number | null {
  const m = s.replace(/\./g, "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// "9", "22", "26/06/26" → dia do mês (primeiro número ≤ 31).
function parseDia(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2})\b/);
  if (!m) return null;
  const d = Number(m[1]);
  return d >= 1 && d <= 31 ? d : null;
}

export async function carregarCarteira(): Promise<CarteiraFinanceira> {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheets ${res.status}`);
    const linhas = parseCsv(await res.text());

    const carteira: ClientePagamento[] = [];
    const devedores: Devedor[] = [];
    const ativosSemDia: string[] = [];

    for (const r of linhas.slice(2)) {
      const nome = (r[COL_EMPRESA] ?? "").trim();
      if (!nome) continue;
      const situacao = (r[COL_SITUACAO] ?? "").trim().toLowerCase();
      const fee = parseFee(r[COL_FEE] ?? "");

      if (situacao === "ativo" || situacao === "ativa") {
        const dia = parseDia(r[COL_PGTO] ?? "");
        if (dia && fee) carteira.push({ nome, dia, fee });
        else ativosSemDia.push(nome);
      } else if (situacao === "devendo") {
        devedores.push({ nome, contato: (r[COL_CONTATO] ?? "").trim(), fee });
      }
    }

    if (!carteira.length) throw new Error("planilha sem ativos com dia de pagamento");
    return { carteira, devedores, ativosSemDia, fonte: "planilha" };
  } catch {
    return { carteira: CARTEIRA_RESERVA, devedores: DEVEDORES_RESERVA, ativosSemDia: [], fonte: "reserva" };
  }
}

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

function venceNoDia(cliente: ClientePagamento, data: Date): boolean {
  const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  return Math.min(cliente.dia, ultimoDia) === data.getDate();
}

export async function montarMensagemCobrancaClientes(hoje: Date): Promise<string | null> {
  const { carteira, devedores, ativosSemDia, fonte } = await carregarCarteira();
  const amanha = new Date(hoje.getTime() + 86400000);

  const vencemHoje = carteira.filter((c) => venceNoDia(c, hoje));
  const vencemAmanha = carteira.filter((c) => venceNoDia(c, amanha));
  const ehSegunda = hoje.getDay() === 1;

  if (!vencemHoje.length && !vencemAmanha.length && !ehSegunda) return null;

  const partes: string[] = ["💰 *Cobrança de clientes — MPX*"];

  if (vencemHoje.length) {
    const total = vencemHoje.reduce((s, c) => s + c.fee, 0);
    partes.push(
      `📅 *Vence HOJE (dia ${hoje.getDate()}):*\n` +
        vencemHoje.map((c) => `• ${c.nome} — ${brl(c.fee)}`).join("\n") +
        `\nTotal do dia: ${brl(total)}`
    );
  }

  if (vencemAmanha.length) {
    partes.push(
      `⏭️ *Vence amanhã (dia ${amanha.getDate()}):*\n` +
        vencemAmanha.map((c) => `• ${c.nome} — ${brl(c.fee)}`).join("\n")
    );
  }

  if (ehSegunda && devedores.length) {
    partes.push(
      `🔴 *Devedores em aberto (cobrar essa semana):*\n` +
        devedores
          .map((d) => `• ${d.nome} (${d.contato})${d.fee ? ` — ${brl(d.fee)}` : ""}`)
          .join("\n")
    );
  }

  if (ehSegunda && ativosSemDia.length) {
    partes.push(
      `⚪ Ativos sem dia de pagamento na planilha (preencher pra eu conseguir cobrar): ${ativosSemDia.join(", ")}`
    );
  }

  partes.push(
    fonte === "planilha"
      ? "_Fonte: planilha do financeiro (Google Sheets)._"
      : "⚠️ _Planilha do Google fora do ar — usei a lista de reserva de jul/2026._"
  );
  return partes.join("\n\n");
}
