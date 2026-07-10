// Matriz de prioridade MPX — definida pelo Matheus em 09/07/2026.
// Prioridade final cruza: urgência operacional real > risco de churn >
// potencial de crescimento > rotina, ponderada pelo valor do cliente (tier).
// Nunca ordena só por valor pago: cliente C com campanha parada vem antes
// de cliente A com tarefa simples. Itens travados em terceiros saem da fila
// e vão pros blocos "Aguardando cliente" / "Aguardando equipe".

export type Tier = "A" | "B" | "C" | "aluno" | "interno";

// Tier por fee/mês (memory/02_clientes_mpx.md, jul/2026):
// A ≥ R$1.000 ou estratégico · B R$650–997 · C R$497 · aluno mentoria · interno MPX.
const TIER_CLIENTES: Record<string, Tier> = {
  "revest": "A", "ana karoline": "A", "dino store": "A", "pavimold": "A",
  "amalle": "A", "centro oeste": "A", "abel": "A", "agri manut": "A",
  "dicasa": "A", "nlaser": "A", "n laser": "A", "lc motors": "A",
  "moto pneus": "B", "zezinho": "B", "hulligel": "B", "dom caetano": "B",
  "nutri mais": "B", "nutrimais": "B", "mult profiss": "B",
  "outlet modas": "C", "suzy": "C", "toda chic": "C", "mayara": "C",
  "ortobom": "aluno", "tiago": "aluno", "delicias da midi": "aluno",
  "delícias da midi": "aluno",
  "mpx": "interno", "resgate": "interno",
};

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function detectarTier(texto: string): Tier {
  const t = norm(texto);
  if (/\(alun[oa]\)/.test(t)) return "aluno";
  for (const [chave, tier] of Object.entries(TIER_CLIENTES)) {
    if (t.includes(norm(chave))) return tier;
  }
  return "B"; // recorrente padrão quando não mapeado
}

// 1. Urgência operacional real — topo absoluto.
const PADROES_CRITICO = [
  /campanha (parou|parada|sem rodar|nao esta rodando|não está rodando)/i,
  /(saldo|verba) (zerad|acabou|acabando|insuficiente)/i,
  /sem saldo/i,
  /horario errado|horário errado/i,
  /cliente cobrando|cobrando (resposta|retorno)/i,
  /cancelamento|cancelar|risco de cancel/i,
  /sem movimenta[çc][ãa]o/i,
  /sem atualiza[çc][ãa]o/i,
  /criativo parado/i,
  /(prazo|entrega|reuni[ãa]o)[^\n]{0,20}(hoje|para hoje)/i,
  /\burgente\b/i,
];

// 3. Risco de churn — quase-crítico.
const PADROES_CHURN = [
  /reclama/i,
  /insatisf/i,
  /sem resultado/i,
  /atendimento fraco/i,
  /falta de criativo|sem criativo/i,
  /alinhamento pendente/i,
  /renova[çc][ãa]o/i,
];

// 4. Potencial de crescimento.
const PADROES_POTENCIAL = [
  /\bproposta\b/i, /escalar/i, /expandir/i, /\bcase\b/i, /\bcontrato\b/i,
  /indicar|indica[çc][ãa]o/i, /adicional/i, /nova unidade|outra unidade/i,
];

// Blocos de espera (fora da fila de execução).
const PADROES_AGUARDANDO_CLIENTE = [
  /(esperando|aguardando)[^\n]{0,30}(resposta|retorno|cliente|acesso|aprova[çc][ãa]o|sald|pagamento|adi[çc][ãa]o de saldo)/i,
];
const PADROES_AGUARDANDO_EQUIPE = [
  /(esperando|aguardando)[^\n]{0,30}(luis|lu[ií]s|adrian|murilo|matheus|edi[çc][ãa]o|equipe|time|social m[ií]dia|entrar o social)/i,
];

export type Categoria = "critico" | "churn" | "potencial" | "rotina";
export type Bloco = "prioridade" | "aguardando_cliente" | "aguardando_equipe";

const PESO_CATEGORIA: Record<Categoria, number> = {
  critico: 1000,
  churn: 800,
  potencial: 500,
  rotina: 100,
};

const PESO_TIER: Record<Tier, number> = {
  A: 150, B: 80, C: 40, aluno: 10, interno: 20,
};

export type ItemClassificado = {
  texto: string;
  categoria: Categoria;
  tier: Tier;
  bloco: Bloco;
  score: number;
};

export function classificarItem(texto: string): ItemClassificado {
  const bloco: Bloco = PADROES_AGUARDANDO_EQUIPE.some((p) => p.test(texto))
    ? "aguardando_equipe"
    : PADROES_AGUARDANDO_CLIENTE.some((p) => p.test(texto))
      ? "aguardando_cliente"
      : "prioridade";

  const categoria: Categoria = PADROES_CRITICO.some((p) => p.test(texto))
    ? "critico"
    : PADROES_CHURN.some((p) => p.test(texto))
      ? "churn"
      : PADROES_POTENCIAL.some((p) => p.test(texto))
        ? "potencial"
        : "rotina";

  const tier = detectarTier(texto);
  return { texto, categoria, tier, bloco, score: PESO_CATEGORIA[categoria] + PESO_TIER[tier] };
}

export function classificarItens(textos: string[]): ItemClassificado[] {
  return textos.map(classificarItem).sort((a, b) => b.score - a.score);
}

// Compat: usado onde só interessa a ordem final (lista corrida).
export function ordenarPorPrioridade<T extends { texto: string }>(itens: T[]): T[] {
  return [...itens].sort(
    (a, b) => classificarItem(b.texto).score - classificarItem(a.texto).score
  );
}

// ── Resumo diário enxuto (WhatsApp = alerta; ClickUp = fonte oficial) ──────

export function montarResumoDiario(
  nome: string,
  pendentes: string[],
  paginaNome: string,
  concluidas = 0
): string {
  if (!pendentes.length) {
    return (
      `📋 *Resumo diário — ${nome}* (${paginaNome})\n\n` +
      `Nenhuma pendência aberta no checklist de hoje. 👏` +
      (concluidas ? `\n✅ Concluídas: ${concluidas}` : "")
    );
  }

  const itens = classificarItens(pendentes);
  const fila = itens.filter((i) => i.bloco === "prioridade");
  const aguardCliente = itens.filter((i) => i.bloco === "aguardando_cliente");
  const aguardEquipe = itens.filter((i) => i.bloco === "aguardando_equipe");

  const top = fila.slice(0, 5);
  const criticasForaDoTop = fila.slice(5).filter((i) => i.categoria === "critico");
  const icone = (c: Categoria) =>
    c === "critico" ? "🔴 " : c === "churn" ? "🟠 " : c === "potencial" ? "🟢 " : "";

  const partes: string[] = [`📋 *Resumo diário — ${nome}* (${paginaNome})`];

  partes.push(
    `*Prioridades de hoje:*\n` +
      top.map((i, n) => `${n + 1}. ${icone(i.categoria)}${i.texto}`).join("\n")
  );

  if (criticasForaDoTop.length) {
    partes.push(
      `*Outras críticas:*\n` + criticasForaDoTop.map((i) => `• 🔴 ${i.texto}`).join("\n")
    );
  }

  if (aguardCliente.length) {
    const mostra = aguardCliente.slice(0, 6);
    const extra = aguardCliente.length - mostra.length;
    partes.push(
      `*Aguardando cliente:*\n` +
        mostra.map((i) => `• ${i.texto}`).join("\n") +
        (extra > 0 ? `\n• …e mais ${extra}` : "")
    );
  }

  if (aguardEquipe.length) {
    partes.push(`*Aguardando equipe:*\n` + aguardEquipe.map((i) => `• ${i.texto}`).join("\n"));
  }

  const rodape: string[] = [`📌 Lista completa (${pendentes.length} itens abertos) na ata do ClickUp.`];
  if (concluidas) rodape.push(`✅ Concluídas hoje: ${concluidas}`);
  rodape.push(
    `🔔 *Cobrança do dia:* atualizar no ClickUp status, próxima ação e evidência das tarefas críticas até o fim do dia.`
  );
  partes.push(rodape.join("\n"));

  return partes.join("\n\n");
}

// ── Resumo final do dia pro Matheus ────────────────────────────────────────

export type PessoaFimDeDia = {
  nome: string;
  concluidas: number;
  pendentes: string[];
};

export function montarResumoFimDeDia(pessoas: PessoaFimDeDia[], paginaNome: string): string {
  const partes: string[] = [`🌙 *Fechamento do dia — ${paginaNome}*`];

  for (const p of pessoas) {
    const itens = classificarItens(p.pendentes);
    const criticas = itens.filter((i) => i.categoria === "critico" && i.bloco === "prioridade");
    const churn = itens.filter((i) => i.categoria === "churn" && i.bloco === "prioridade");
    const aguardCliente = itens.filter((i) => i.bloco === "aguardando_cliente");

    const linhas: string[] = [
      `*${p.nome}* — ✅ ${p.concluidas} concluída(s) | ⏳ ${p.pendentes.length} aberta(s)`,
    ];
    if (criticas.length) {
      linhas.push(`🔴 Críticas abertas:\n${criticas.map((i) => `  • ${i.texto}`).join("\n")}`);
    }
    if (churn.length) {
      linhas.push(`🟠 Risco de churn:\n${churn.map((i) => `  • ${i.texto}`).join("\n")}`);
    }
    if (aguardCliente.length) {
      linhas.push(`⏸️ Aguardando cliente: ${aguardCliente.length} item(ns)`);
    }
    partes.push(linhas.join("\n"));
  }

  const todasCriticas = pessoas.flatMap((p) =>
    classificarItens(p.pendentes).filter(
      (i) => i.categoria !== "rotina" && i.bloco === "prioridade"
    )
  );
  if (todasCriticas.length) {
    partes.push(
      `📣 *Cobrar amanhã:*\n` +
        todasCriticas.slice(0, 10).map((i) => `• ${i.texto}`).join("\n") +
        (todasCriticas.length > 10 ? `\n• …e mais ${todasCriticas.length - 10}` : "")
    );
  } else {
    partes.push(`Nada crítico em aberto. Dia limpo. 👏`);
  }

  return partes.join("\n\n");
}
