// Agente Cobrança de Clientes (Financeiro): avisa quem vence hoje/amanhã
// pelo dia de pagamento de cada cliente e lembra os devedores em aberto.
// Fonte: memory/02_clientes_mpx.md (jul/2026). Manter à mão quando entrar
// ou sair cliente — é config estática, não vem do ClickUp/portal ainda.

type ClientePagamento = { nome: string; dia: number; fee: number };

const CARTEIRA: ClientePagamento[] = [
  { nome: "Abel", dia: 5, fee: 1000 },
  { nome: "Pavimold", dia: 9, fee: 1133 },
  { nome: "Restaurante Centro Oeste", dia: 15, fee: 1000 },
  { nome: "Agri Manutenção Agrícolas", dia: 15, fee: 1000 },
  { nome: "Toda Chic", dia: 15, fee: 497 },
  { nome: "Sup. Dicasa 2", dia: 15, fee: 1000 },
  { nome: "Outlet Modas", dia: 20, fee: 497 },
  { nome: "Dino Store", dia: 20, fee: 1200 },
  { nome: "Zezinho Ar Condicionado", dia: 20, fee: 797 },
  { nome: "N Laser", dia: 20, fee: 1000 },
  { nome: "Dra. Ana Karoline", dia: 20, fee: 1333 },
  { nome: "Pizzaria Hulligel", dia: 22, fee: 650 },
  { nome: "LC Motors", dia: 22, fee: 1000 },
  { nome: "NutriMais Produtos Naturais", dia: 25, fee: 497 },
  { nome: "Moto Pneus", dia: 25, fee: 797 },
  { nome: "Restaurante Mayara", dia: 25, fee: 497 },
  { nome: "Dom Caetano", dia: 25, fee: 650 },
  { nome: "Revest Envelopamentos", dia: 26, fee: 1333 },
  { nome: "Dicasa", dia: 27, fee: 1000 },
  { nome: "Suzy Cabelereira", dia: 30, fee: 497 },
];

// Devedores em aberto (cobrar toda segunda até resolver).
const DEVEDORES = [
  "Warlem Vidraçaria (Warlem)",
  "Foco Odontologia (Lenice)",
  "Drogaria Mônica (Karine)",
  "GB Auto Center (Geovana/Gabriel)",
];

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

// Dia de pagamento maior que o último dia do mês cai no último dia (ex: 30 em fev).
function venceNoDia(cliente: ClientePagamento, data: Date): boolean {
  const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  return Math.min(cliente.dia, ultimoDia) === data.getDate();
}

export function montarMensagemCobrancaClientes(hoje: Date): string | null {
  const amanha = new Date(hoje.getTime() + 86400000);

  const vencemHoje = CARTEIRA.filter((c) => venceNoDia(c, hoje));
  const vencemAmanha = CARTEIRA.filter((c) => venceNoDia(c, amanha));
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

  if (ehSegunda && DEVEDORES.length) {
    partes.push(`🔴 *Devedores em aberto (cobrar essa semana):*\n` + DEVEDORES.map((d) => `• ${d}`).join("\n"));
  }

  partes.push("_Confirmou o pagamento? Marca na planilha/ClickUp pra manter o MRR real._");
  return partes.join("\n\n");
}
