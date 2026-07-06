// Matriz de prioridade para itens de checklist diário (Ata) e cobrança.
// Definida por Matheus em 06/07/2026: urgência + risco cruzados com valor
// do cliente. O eixo de urgência é derivado do texto do item (heurística
// por palavra-chave). O eixo de valor do cliente ainda não está plugado -
// depende de uma fonte de dados que ligue nome do cliente -> plano/MRR
// (hoje só existe em memória/planilha, não em campo estruturado).

export type NivelPrioridade = 1 | 2 | 3 | 4;

export const LABEL_PRIORIDADE: Record<NivelPrioridade, string> = {
  1: "Urgente/Crítico",
  2: "Bloqueado (aguardando terceiro)",
  3: "Potencial de crescimento",
  4: "Rotina operacional",
};

const PADROES_CRITICO = [
  /saldo (da conta )?acabou/i,
  /saldo (da conta )?acabando/i,
  /campanha (parou|parada)/i,
  /cancelamento/i,
  /cobrando/i,
  /urgente/i,
  /reuni[ãa]o (marcada )?(hoje|para hoje)/i,
];

const PADROES_POTENCIAL = [
  /\bproposta\b/i,
  /escalar/i,
  /expandir/i,
  /\bcase\b/i,
  /\bcontrato\b/i,
  /indicar/i,
];

const PADROES_BLOQUEADO = [/esperando resposta/i, /aguardando resposta/i];

export function classificarUrgencia(textoItem: string): NivelPrioridade {
  if (PADROES_CRITICO.some((p) => p.test(textoItem))) return 1;
  if (PADROES_BLOQUEADO.some((p) => p.test(textoItem))) return 2;
  if (PADROES_POTENCIAL.some((p) => p.test(textoItem))) return 3;
  return 4;
}

export function ordenarPorPrioridade<T extends { texto: string }>(itens: T[]): (T & { prioridade: NivelPrioridade })[] {
  return itens
    .map((item) => ({ ...item, prioridade: classificarUrgencia(item.texto) }))
    .sort((a, b) => a.prioridade - b.prioridade);
}

export function agruparPorPrioridade<T extends { texto: string }>(
  itens: T[]
): { prioridade: NivelPrioridade; label: string; itens: T[] }[] {
  const ordenados = ordenarPorPrioridade(itens);
  const grupos = new Map<NivelPrioridade, T[]>();
  for (const item of ordenados) {
    const grupo = grupos.get(item.prioridade) ?? [];
    grupo.push(item);
    grupos.set(item.prioridade, grupo);
  }
  return Array.from(grupos.entries())
    .sort(([a], [b]) => a - b)
    .map(([prioridade, itens]) => ({ prioridade, label: LABEL_PRIORIDADE[prioridade], itens }));
}
