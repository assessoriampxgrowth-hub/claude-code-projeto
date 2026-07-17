// AGENTE DE RENOVAÇÃO DE CONTRATO — fecha a trinca de receita com Retenção e
// Escala. Lê a "Data de Início" da planilha e avisa a HORA CERTA de agir:
// - fim da fidelidade de 3 meses (janela de renovação/renegociação)
// - aniversários (6 meses, 1 ano) = momento de pedir case + indicação
// Nada de perder o timing de renovar cliente bom nem deixar contrato vencer no vácuo.

const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1OSn28DSBu6jq0Koe2Xcn3YwVQ85JL-R_4RRFvQOHzWA/export?format=csv";

const COL_EMPRESA = 2;
const COL_SITUACAO = 14;
const COL_INICIO = 15;

type ClienteContrato = { nome: string; inicio: Date; mesesAtivo: number };

// Parser CSV mínimo com aspas.
function parseCsv(t: string): string[][] {
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); campo = ""; linha = [];
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

// "27/05/25" | "14/07/2026" | "16/07" (assume ano corrente) -> Date.
function parseData(s: string, hoje: Date): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]) - 1;
  let ano = m[3] ? Number(m[3]) : hoje.getFullYear();
  if (ano < 100) ano += 2000;
  const d = new Date(ano, mes, dia);
  return isNaN(d.getTime()) ? null : d;
}

function mesesEntre(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
}

export type AvisoRenovacao = {
  cliente: string;
  tipo: "fidelidade" | "aniversario";
  mensagem: string;
};

export async function avisosRenovacao(hoje = new Date()): Promise<AvisoRenovacao[]> {
  let clientes: ClienteContrato[] = [];
  try {
    const res = await fetch(SHEET_CSV, { cache: "no-store" });
    const linhas = parseCsv(await res.text());
    for (const r of linhas.slice(2)) {
      const nome = (r[COL_EMPRESA] ?? "").trim();
      const sit = (r[COL_SITUACAO] ?? "").trim().toLowerCase();
      if (!nome || (sit !== "ativo" && sit !== "ativa")) continue;
      const inicio = parseData(r[COL_INICIO] ?? "", hoje);
      if (!inicio || inicio > hoje) continue;
      clientes.push({ nome, inicio, mesesAtivo: mesesEntre(inicio, hoje) });
    }
  } catch {
    return [];
  }

  const avisos: AvisoRenovacao[] = [];
  const diaSemana7 = 7 * 86400000;

  for (const c of clientes) {
    // Data em que fecha cada marco (mês exato do início).
    const marco = (meses: number) => new Date(c.inicio.getFullYear(), c.inicio.getMonth() + meses, c.inicio.getDate());
    const proximo = (data: Date) => data >= hoje && data.getTime() - hoje.getTime() <= diaSemana7;

    // Fidelidade mínima = 3 meses. Avisa na semana em que fecha.
    if (proximo(marco(3))) {
      avisos.push({
        cliente: c.nome,
        tipo: "fidelidade",
        mensagem: `Fecha 3 MESES (fim da fidelidade) em ${marco(3).toLocaleDateString("pt-BR")}. Confirmar continuidade — e se tá indo bem, é hora de RENEGOCIAR pra cima (mais verba/plano maior).`,
      });
    }
    // Aniversários de 6 em 6 meses = case + indicação.
    for (const m of [6, 12, 18, 24, 36]) {
      if (proximo(marco(m))) {
        const anos = m / 12;
        const rotulo = m % 12 === 0 ? `${anos} ANO(S)` : `${m} meses`;
        avisos.push({
          cliente: c.nome,
          tipo: "aniversario",
          mensagem: `Completa ${rotulo} de MPX em ${marco(m).toLocaleDateString("pt-BR")}. Cliente fiel = pedir DEPOIMENTO forte + INDICAÇÃO + transformar em case.`,
        });
      }
    }
  }
  return avisos;
}

export function montarMensagemRenovacao(avisos: AvisoRenovacao[]): string | null {
  if (!avisos.length) return null; // nada esta semana — não incomoda
  const fid = avisos.filter((a) => a.tipo === "fidelidade");
  const ani = avisos.filter((a) => a.tipo === "aniversario");

  const partes: string[] = [`📆 *RENOVAÇÃO & MARCOS — esta semana*`];
  if (fid.length) {
    partes.push(`🔑 *Fim de fidelidade (renegociar/renovar):*\n` + fid.map((a) => `• *${a.cliente}* — ${a.mensagem}`).join("\n\n"));
  }
  if (ani.length) {
    partes.push(`🎉 *Aniversários de contrato (case + indicação):*\n` + ani.map((a) => `• *${a.cliente}* — ${a.mensagem}`).join("\n\n"));
  }
  partes.push(`_Renovar cliente bom na hora certa vale mais que 3 clientes novos._`);
  return partes.join("\n\n");
}
