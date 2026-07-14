// JORNADA DE ENTREGA DO CLIENTE (método MPX) — spec do Matheus, 14/07/2026.
// Gera o cronograma datado a partir da entrada do cliente. Serve pra 3 coisas:
// 1) o cliente saber exatamente o que recebe e quando (para de cobrar antes da hora)
// 2) o time saber o que entregar e quando (nada cai no esquecimento)
// 3) material de venda — mostrar o cronograma na reunião passa profissionalismo
//
// A âncora técnica do método é o AQUECIMENTO DO NÚMERO: WhatsApp que dispara
// em massa antes de ~15 dias de atividade gradual é banido. Por isso o primeiro
// disparo fica em D+18, nunca antes.

export type Plano = "essencial" | "profissional" | "antigo";

export type EtapaJornada = {
  dia: number; // dias corridos após a entrada
  titulo: string;
  responsavel: "MPX" | "Cliente" | "MPX + Cliente";
  descricao: string;
  marco?: boolean; // marcos visíveis pro cliente
};

const METODO: EtapaJornada[] = [
  // ── Semana 1: Fundação ──────────────────────────────────────────────────
  {
    dia: 0,
    titulo: "Boas-vindas e briefing",
    responsavel: "MPX + Cliente",
    descricao: "Contrato assinado. Enviamos o formulário de briefing pra entender o negócio, o público e a oferta.",
    marco: true,
  },
  {
    dia: 2,
    titulo: "Reunião de kickoff",
    responsavel: "MPX + Cliente",
    descricao: "Alinhamento da estratégia, metas do mês e coleta dos acessos (Instagram, Facebook, WhatsApp).",
    marco: true,
  },
  {
    dia: 3,
    titulo: "Setup das contas",
    responsavel: "MPX",
    descricao: "Criação/configuração do Business Manager, conta de anúncio, pixel e Google Meu Negócio.",
  },
  {
    dia: 3,
    titulo: "🔥 Início do aquecimento do número",
    responsavel: "MPX",
    descricao:
      "Conectamos o WhatsApp e começamos o aquecimento gradual. É o que garante que o disparo em massa NÃO derrube o número. Leva ~15 dias — por isso o disparo só acontece depois.",
    marco: true,
  },
  {
    dia: 6,
    titulo: "Roteiros dos criativos",
    responsavel: "MPX",
    descricao: "Roteiros da primeira leva de criativos, enviados pra sua aprovação.",
  },

  // ── Semana 2: Produção e primeira campanha ──────────────────────────────
  {
    dia: 9,
    titulo: "Dia de gravação",
    responsavel: "MPX + Cliente",
    descricao: "Gravação dos criativos na sua loja/operação. Você só precisa estar disponível no horário combinado.",
    marco: true,
  },
  {
    dia: 11,
    titulo: "Edição dos criativos",
    responsavel: "MPX",
    descricao: "Edição no padrão MPX e envio pra aprovação.",
  },
  {
    dia: 13,
    titulo: "🚀 PRIMEIRA CAMPANHA NO AR",
    responsavel: "MPX",
    descricao: "Campanhas de captação no ar. A partir daqui começam a chegar os primeiros leads no seu WhatsApp.",
    marco: true,
  },

  // ── Semana 3: Disparo ───────────────────────────────────────────────────
  {
    dia: 16,
    titulo: "Base de contatos + copy do disparo",
    responsavel: "MPX + Cliente",
    descricao: "Organizamos sua base de contatos antigos e preparamos a mensagem de reativação pra sua aprovação.",
  },
  {
    dia: 18,
    titulo: "📢 PRIMEIRO DISPARO EM MASSA",
    responsavel: "MPX",
    descricao:
      "Disparo pra reativar sua base inativa. Acontece no dia 18 porque o número precisa estar aquecido — disparar antes disso é o que faz WhatsApp ser banido.",
    marco: true,
  },
  {
    dia: 21,
    titulo: "Primeiro relatório de performance",
    responsavel: "MPX",
    descricao: "Relatório com leads gerados, investimento, custo por conversa e melhores criativos.",
    marco: true,
  },

  // ── Semana 4: Otimização e fechamento do 1º ciclo ───────────────────────
  {
    dia: 24,
    titulo: "Otimização das campanhas",
    responsavel: "MPX",
    descricao: "Com dados reais em mãos: pausamos o que não performa e escalamos o que está dando resultado.",
  },
  {
    dia: 27,
    titulo: "Segunda leva de criativos",
    responsavel: "MPX",
    descricao: "Novos criativos baseados no que já validou no primeiro ciclo.",
  },
  {
    dia: 30,
    titulo: "📊 Relatório mensal + reunião de alinhamento",
    responsavel: "MPX + Cliente",
    descricao: "Fechamento do primeiro mês: o que funcionou, o que muda, e o plano do mês seguinte.",
    marco: true,
  },
];

function addDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * 86400000);
}

const fmt = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const fmtLongo = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

// Cadência recorrente conforme o plano contratado.
function cadencia(plano: Plano): string {
  return plano === "profissional"
    ? "• Relatórios detalhados a cada 15 dias\n• Reunião de alinhamento quinzenal\n• 12 criativos/mês\n• 1 disparo estratégico por mês"
    : "• Relatório mensal de performance\n• Reunião de alinhamento mensal\n• 6 criativos/mês";
}

// ── Versão do CLIENTE (pra mandar/apresentar) ─────────────────────────────
export function jornadaParaCliente(cliente: string, entrada: Date, plano: Plano): string {
  const marcos = METODO.filter((e) => e.marco);
  const linhas = marcos.map((e) => {
    const d = addDias(entrada, e.dia);
    return `*${fmt(d)}* — ${e.titulo}\n_${e.descricao}_`;
  });

  return (
    `🗺️ *SEU PLANO DE ENTREGA — ${cliente}*\n_Método MPX Multiplica · início em ${fmt(entrada)}_\n\n` +
    `Pra você saber exatamente o que vai acontecer e quando. Nada aqui é improviso — cada etapa tem um motivo.\n\n` +
    `${linhas.join("\n\n")}\n\n` +
    `♻️ *A partir do 2º mês:*\n${cadencia(plano)}\n\n` +
    `❓ *Por que o disparo só acontece no dia 18?*\nPorque o WhatsApp precisa ser aquecido antes. Número novo que dispara em massa cedo demais é BANIDO pelo WhatsApp — e a gente não vai colocar seu canal de vendas em risco. Os 15 dias de aquecimento são o que garante que o disparo aconteça com segurança.\n\n` +
    `_Equipe MPX Multiplica_ 🚀`
  );
}

// ── Versão INTERNA (tarefas datadas pro time) ─────────────────────────────
export function jornadaInterna(cliente: string, entrada: Date, plano: Plano): string {
  const linhas = METODO.map((e) => {
    const d = addDias(entrada, e.dia);
    const resp = e.responsavel === "Cliente" ? "👤" : e.responsavel === "MPX" ? "🏢" : "🤝";
    return `*D+${e.dia}* · ${fmtLongo(d)} ${resp} ${e.titulo}\n   ${e.descricao}`;
  });

  return (
    `🔒 *JORNADA INTERNA — ${cliente}*\nEntrada: ${fmt(entrada)} | Plano: ${plano}\n\n` +
    `${linhas.join("\n\n")}\n\n` +
    `⚠️ *Regra inegociável:* o disparo em massa NÃO pode acontecer antes do D+18. Número sem aquecimento = ban. Se o cliente cobrar antes, mostrar o cronograma.`
  );
}

export function etapasDoDia(entrada: Date, hoje: Date): EtapaJornada[] {
  const diasCorridos = Math.round((hoje.getTime() - entrada.getTime()) / 86400000);
  return METODO.filter((e) => e.dia === diasCorridos);
}
