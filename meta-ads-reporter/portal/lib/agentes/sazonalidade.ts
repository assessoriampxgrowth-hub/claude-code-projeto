// Agente Sazonalidade: radar de datas comerciais do varejo brasileiro cruzado
// com o portfólio de clientes ativos da MPX. Roda toda segunda e avisa quais
// clientes têm data relevante chegando e quando começar os criativos.

type Categoria =
  | "moda"
  | "alimentacao"
  | "beleza"
  | "saude"
  | "presentes"
  | "veiculos"
  | "lar"
  | "varejo"
  | "servicos"
  | "agro";

const TODAS: Categoria[] = [
  "moda", "alimentacao", "beleza", "saude", "presentes",
  "veiculos", "lar", "varejo", "servicos", "agro",
];

// Clientes ativos MPX por segmento (fonte: memory/02_clientes_mpx.md, jul/2026).
const CLIENTES_ATIVOS: { nome: string; categorias: Categoria[] }[] = [
  { nome: "Amalle Calçados", categorias: ["moda"] },
  { nome: "Toda Chic", categorias: ["moda"] },
  { nome: "Outlet Modas", categorias: ["moda", "varejo"] },
  { nome: "Dino Store", categorias: ["varejo"] },
  { nome: "Restaurante Centro Oeste", categorias: ["alimentacao"] },
  { nome: "Restaurante Mayara", categorias: ["alimentacao"] },
  { nome: "Pizzaria Hulligel", categorias: ["alimentacao"] },
  { nome: "Dom Caetano", categorias: ["alimentacao"] },
  { nome: "Dicasa Supermercado", categorias: ["alimentacao", "varejo"] },
  { nome: "Ortobom", categorias: ["lar", "varejo"] },
  { nome: "NutriMais", categorias: ["saude", "varejo"] },
  { nome: "Dra. Ana Karoline", categorias: ["saude"] },
  { nome: "Suzy Cabelereira", categorias: ["beleza"] },
  { nome: "N Laser", categorias: ["presentes"] },
  { nome: "LC Motors", categorias: ["veiculos"] },
  { nome: "Moto Pneus", categorias: ["veiculos"] },
  { nome: "Zezinho Ar Condicionado", categorias: ["lar", "servicos"] },
  { nome: "Revest Envelopamentos", categorias: ["lar", "servicos"] },
  { nome: "Pavimold", categorias: ["servicos"] },
  { nome: "Agri Manutenção", categorias: ["agro", "servicos"] },
  { nome: "Abel", categorias: ["varejo"] },
];

type DataComercial = {
  nome: string;
  data: Date;
  categorias: Categoria[];
  // Dias antes da data em que os criativos/campanha já deveriam estar rodando.
  antecedenciaCriativos: number;
};

// Domingo N do mês (1-indexado): Dia das Mães = 2º dom/maio, Dia dos Pais = 2º dom/agosto.
function nesimoDomingo(ano: number, mesIndex: number, n: number): Date {
  const d = new Date(ano, mesIndex, 1);
  const offset = (7 - d.getDay()) % 7;
  return new Date(ano, mesIndex, 1 + offset + (n - 1) * 7);
}

// Páscoa (algoritmo de Meeus/Jones/Butcher).
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function blackFriday(ano: number): Date {
  // Sexta após a 4ª quinta-feira de novembro.
  const d = new Date(ano, 10, 1);
  const offsetQuinta = (4 - d.getDay() + 7) % 7;
  return new Date(ano, 10, 1 + offsetQuinta + 21 + 1);
}

function datasDoAno(ano: number): DataComercial[] {
  const carnaval = new Date(pascoa(ano).getTime() - 47 * 86400000);
  return [
    { nome: "Volta às Aulas (1º semestre)", data: new Date(ano, 0, 20), categorias: ["varejo", "moda"], antecedenciaCriativos: 14 },
    { nome: "Carnaval", data: carnaval, categorias: ["alimentacao", "beleza", "moda"], antecedenciaCriativos: 14 },
    { nome: "Dia da Mulher", data: new Date(ano, 2, 8), categorias: ["moda", "beleza", "presentes", "saude"], antecedenciaCriativos: 14 },
    { nome: "Dia do Consumidor", data: new Date(ano, 2, 15), categorias: TODAS, antecedenciaCriativos: 14 },
    { nome: "Páscoa", data: pascoa(ano), categorias: ["alimentacao", "presentes", "varejo"], antecedenciaCriativos: 21 },
    { nome: "Dia das Mães", data: nesimoDomingo(ano, 4, 2), categorias: ["moda", "beleza", "presentes", "alimentacao", "lar", "saude", "varejo"], antecedenciaCriativos: 21 },
    { nome: "Dia dos Namorados", data: new Date(ano, 5, 12), categorias: ["moda", "alimentacao", "presentes", "beleza"], antecedenciaCriativos: 14 },
    { nome: "São João / Festas Juninas", data: new Date(ano, 5, 24), categorias: ["alimentacao", "varejo"], antecedenciaCriativos: 14 },
    { nome: "Dia do Amigo", data: new Date(ano, 6, 20), categorias: ["presentes", "alimentacao"], antecedenciaCriativos: 7 },
    { nome: "Dia dos Avós", data: new Date(ano, 6, 26), categorias: ["presentes", "saude", "alimentacao"], antecedenciaCriativos: 7 },
    { nome: "Volta às Aulas (2º semestre)", data: new Date(ano, 6, 27), categorias: ["varejo", "moda"], antecedenciaCriativos: 14 },
    { nome: "Dia dos Pais", data: nesimoDomingo(ano, 7, 2), categorias: ["moda", "veiculos", "presentes", "alimentacao", "lar", "varejo"], antecedenciaCriativos: 21 },
    { nome: "Dia do Cliente", data: new Date(ano, 8, 15), categorias: TODAS, antecedenciaCriativos: 14 },
    { nome: "Dia das Crianças", data: new Date(ano, 9, 12), categorias: ["moda", "alimentacao", "presentes", "varejo"], antecedenciaCriativos: 21 },
    { nome: "Black Friday", data: blackFriday(ano), categorias: TODAS, antecedenciaCriativos: 30 },
    { nome: "Natal", data: new Date(ano, 11, 25), categorias: TODAS, antecedenciaCriativos: 30 },
    { nome: "Ano Novo / Réveillon", data: new Date(ano, 11, 31), categorias: ["alimentacao", "moda", "beleza"], antecedenciaCriativos: 14 },
  ];
}

export type AlertaSazonal = {
  nome: string;
  data: Date;
  diasRestantes: number;
  prazoInicioCriativos: Date;
  clientes: string[];
  urgente: boolean; // já passou da data ideal de começar os criativos
};

export function alertasSazonais(hoje = new Date(), horizonteDias = 45): AlertaSazonal[] {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const limite = new Date(inicio.getTime() + horizonteDias * 86400000);
  const candidatas = [...datasDoAno(inicio.getFullYear()), ...datasDoAno(inicio.getFullYear() + 1)];

  return candidatas
    .filter((d) => d.data >= inicio && d.data <= limite)
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .map((d) => {
      const clientes = CLIENTES_ATIVOS
        .filter((c) => c.categorias.some((cat) => d.categorias.includes(cat)))
        .map((c) => c.nome);
      const diasRestantes = Math.round((d.data.getTime() - inicio.getTime()) / 86400000);
      const prazoInicioCriativos = new Date(d.data.getTime() - d.antecedenciaCriativos * 86400000);
      return {
        nome: d.nome,
        data: d.data,
        diasRestantes,
        prazoInicioCriativos,
        clientes,
        urgente: prazoInicioCriativos <= inicio,
      };
    })
    .filter((a) => a.clientes.length > 0);
}

export function montarMensagemSazonalidade(hoje = new Date()): string {
  const alertas = alertasSazonais(hoje);
  if (!alertas.length) {
    return "📅 *Radar de Sazonalidade MPX*\n\nNenhuma data comercial relevante nos próximos 45 dias.";
  }

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const blocos = alertas.map((a) => {
    const status = a.urgente
      ? "🔴 *criativos já deveriam estar rodando*"
      : `🟡 começar criativos até ${fmt(a.prazoInicioCriativos)}`;
    return (
      `*${a.nome}* — ${fmt(a.data)} (faltam ${a.diasRestantes} dias)\n` +
      `${status}\n` +
      `Clientes que encaixam: ${a.clientes.join(", ")}`
    );
  });

  return (
    `📅 *Radar de Sazonalidade MPX* — próximos 45 dias\n\n` +
    blocos.join("\n\n") +
    `\n\n💡 Priorizar quem está 🔴 e agendar gravação/edição de quem está 🟡.`
  );
}
