// Agente Rodízio de Relacionamento: toda segunda escala clientes da carteira
// viva (planilha do financeiro) em 4 estações — visita, conteúdo/gravação,
// depoimento e auditoria de Instagram + convite pra liveshop. Rotação
// determinística por número da semana: a carteira inteira é coberta em ciclos,
// nenhum cliente fica meses esquecido.

import { carregarCarteira } from "./cobranca-clientes";

const ESTACOES = [
  { nome: "🏠 Visita presencial", instrucao: "passar na loja, olhar no olho, ouvir o dono" },
  { nome: "🎬 Conteúdo/gravação", instrucao: "agendar gravação de criativos e conteúdo orgânico" },
  { nome: "⭐ Depoimento/prova social", instrucao: "colher depoimento em vídeo ou print de resultado" },
  { nome: "📱 Auditoria de Instagram + Liveshop", instrucao: "revisar bio/destaques/feed e propor a primeira liveshop" },
] as const;

const POR_ESTACAO = 2; // clientes por estação por semana

function numeroDaSemana(d: Date): number {
  const inicio = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - inicio.getTime()) / (7 * 86400000));
}

export async function montarMensagemRelacionamento(hoje: Date): Promise<string> {
  const { carteira, ativosSemDia, fonte } = await carregarCarteira();
  // Carteira completa = ativos com e sem dia de pagamento (ordenada pra rotação estável).
  const clientes = [...new Set([...carteira.map((c) => c.nome), ...ativosSemDia])].sort();
  if (!clientes.length) return "🤝 Rodízio de relacionamento: nenhum cliente ativo na planilha.";

  const semana = numeroDaSemana(hoje);
  const blocos: string[] = [
    `🤝 *Rodízio de Relacionamento — semana de ${hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}*`,
  ];

  ESTACOES.forEach((estacao, e) => {
    const escalados: string[] = [];
    for (let k = 0; k < POR_ESTACAO; k++) {
      const idx = (semana * ESTACOES.length * POR_ESTACAO + e * POR_ESTACAO + k) % clientes.length;
      escalados.push(clientes[idx]);
    }
    blocos.push(`*${estacao.nome}:* ${[...new Set(escalados)].join(" e ")}\n_→ ${estacao.instrucao}_`);
  });

  const ciclo = Math.ceil(clientes.length / (ESTACOES.length * POR_ESTACAO));
  blocos.push(
    `📊 Carteira: ${clientes.length} ativos | ciclo completo a cada ~${ciclo} semanas.` +
      (fonte === "reserva" ? "\n⚠️ _Planilha fora do ar — rotação pela lista de reserva._" : "")
  );
  return blocos.join("\n\n");
}
