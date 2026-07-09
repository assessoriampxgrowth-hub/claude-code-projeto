import { montarResumoDiario } from "./priorizacao";

// Doc "Atas" fica num workspace ClickUp separado do espaço Operacional.
// Estrutura do doc: raiz > ano ("2026") > mês ("Julho") > página do dia
// ("08/07 — Quarta - Feira", formatação varia — casar por DD/MM no início).
const ATAS_WORKSPACE_ID = "9013341823";
const ATAS_DOC_ID = "8cktbkz-2073";
const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN ?? "";

// Cabeçalho da seção de cada pessoa dentro da página do dia -> WhatsApp.
// O parser casa por primeiro nome no início de uma linha em negrito.
export const PESSOAS_ATA: { chave: RegExp; nome: string; telefone: string }[] = [
  { chave: /^matheus/i, nome: "Matheus", telefone: "5564996453506" },
  { chave: /^lu[ií]s/i, nome: "Luis", telefone: "5564981050798" },
  { chave: /^adrian/i, nome: "Adrian", telefone: "5564999350869" },
];

type DocPage = {
  id: string;
  name: string | null;
  content: string | null;
  pages?: DocPage[];
};

export type ChecklistPessoa = {
  nome: string;
  telefone: string;
  pendentes: string[];
  concluidas: number;
};

export type ResultadoAta = {
  paginaNome: string | null;
  pessoas: ChecklistPessoa[];
  erro?: string;
};

async function buscarPaginasDoc(): Promise<DocPage[]> {
  const url = `https://api.clickup.com/api/v3/workspaces/${ATAS_WORKSPACE_ID}/docs/${ATAS_DOC_ID}/pages?max_page_depth=-1`;
  const res = await fetch(url, { headers: { Authorization: CLICKUP_TOKEN } });
  if (!res.ok) {
    throw new Error(`ClickUp Docs API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<DocPage[]>;
}

function acharPaginaDoDia(paginas: DocPage[], hoje: Date): DocPage | null {
  const ano = String(hoje.getFullYear());
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  // Aceita "08/07", "8/07", "08 / 07" etc. no início do nome da página.
  const padraoDia = new RegExp(`^0?${Number(dia)}\\s*/\\s*0?${Number(mes)}(\\D|$)`);

  const raizAno = paginas.find((p) => (p.name ?? "").trim() === ano);
  const escopo = raizAno ? [raizAno] : paginas;

  let achada: DocPage | null = null;
  const walk = (ps: DocPage[]) => {
    for (const p of ps) {
      if (padraoDia.test((p.name ?? "").trim())) achada = p;
      walk(p.pages ?? []);
    }
  };
  walk(escopo);
  return achada;
}

function limparTextoItem(linha: string): string {
  return linha
    .replace(/^-\s*\[[ xX]\]\s*/, "")
    .replace(/[*_~]/g, "")
    .replace(/^[•\-–\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Divide o conteúdo da página nas seções de cada pessoa. Cabeçalhos são
// linhas curtas em negrito com o nome ("**Matheus Jesus**", "**Adrian**").
export function extrairChecklists(conteudo: string): ChecklistPessoa[] {
  const linhas = conteudo.split(/\r?\n/);
  const resultado = new Map<string, ChecklistPessoa>();
  let atual: ChecklistPessoa | null = null;

  for (const linha of linhas) {
    const semMarkdown = linha.replace(/[*_~]/g, "").trim();
    const ehChecklist = /^-\s*\[[ xX]\]/.test(linha.trim());

    if (!ehChecklist && semMarkdown && semMarkdown.length <= 40) {
      const pessoa = PESSOAS_ATA.find((p) => p.chave.test(semMarkdown));
      if (pessoa) {
        if (!resultado.has(pessoa.nome)) {
          resultado.set(pessoa.nome, {
            nome: pessoa.nome,
            telefone: pessoa.telefone,
            pendentes: [],
            concluidas: 0,
          });
        }
        atual = resultado.get(pessoa.nome)!;
        continue;
      }
    }

    if (ehChecklist && atual) {
      const feita = /^-\s*\[[xX]\]/.test(linha.trim());
      if (feita) {
        atual.concluidas++;
      } else {
        const texto = limparTextoItem(linha.trim());
        if (texto) atual.pendentes.push(texto);
      }
    }
  }

  return Array.from(resultado.values());
}

// A Vercel roda em UTC; a ata do dia segue o calendário de Brasília (UTC-3,
// sem horário de verão desde 2019). Sem isso, um cron entre 21h e 0h BRT
// abriria a ata do dia seguinte.
export function hojeBrasilia(agora = new Date()): Date {
  const utcMs = agora.getTime() + agora.getTimezoneOffset() * 60000;
  return new Date(utcMs - 3 * 3600000);
}

export async function buscarAtaDoDia(hoje = hojeBrasilia()): Promise<ResultadoAta> {
  const paginas = await buscarPaginasDoc();
  const pagina = acharPaginaDoDia(paginas, hoje);
  if (!pagina) {
    return {
      paginaNome: null,
      pessoas: [],
      erro: `Página da ata de hoje (${hoje.toLocaleDateString("pt-BR")}) não encontrada no doc`,
    };
  }
  return {
    paginaNome: (pagina.name ?? "").trim(),
    pessoas: extrairChecklists(pagina.content ?? ""),
  };
}

// Resumo diário enxuto (matriz de prioridade completa do Matheus, 09/07/2026):
// top 3-5 prioridades + blocos Aguardando cliente/equipe. A lista completa
// fica na ata do ClickUp — WhatsApp é alerta e cobrança, não substituto.
export function montarMensagemAta(pessoa: ChecklistPessoa, paginaNome: string): string {
  return montarResumoDiario(pessoa.nome, pessoa.pendentes, paginaNome, pessoa.concluidas);
}
