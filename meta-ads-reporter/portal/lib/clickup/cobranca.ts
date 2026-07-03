import { clickupFetch, ClickUpTask } from "./client";

// Listas do espaço "Operacional" relevantes para cobrança interna e pauta diária.
// IDs obtidos da hierarquia do workspace MPX (space "Operacional").
const LISTAS_MONITORADAS: Record<string, string> = {
  "901303800117": "Demandas do Cliente",
  "901304089929": "Tarefas Comerciais",
  "901303828290": "Solicitações",
  "901303800111": "Onboarding",
  "901303800112": "Kickoff",
  "901303800120": "Criativos",
  "901303615489": "Tarefas de tráfego",
  "901303618219": "Atividades Rotineiras",
  "901303800121": "Otimizações",
  "901303800118": "Campanhas",
};

// Mapa ClickUp assignee ID -> WhatsApp (E.164 sem "+").
// Adrian, Luís e Murilo ainda não são membros do ClickUp — assim que forem
// convidados e tiverem tarefas atribuídas, adicionar o ID deles aqui.
export const RESPONSAVEL_WHATSAPP: Record<number, { nome: string; telefone: string }> = {
  89214852: { nome: "Matheus", telefone: "5564996453506" },
};

export type TarefaAtrasada = {
  id: string;
  nome: string;
  lista: string;
  url: string;
  dueDate: Date;
  assigneeId: number;
  assigneeNome: string;
};

export async function buscarTarefasAtrasadas(): Promise<TarefaAtrasada[]> {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  const resultados: TarefaAtrasada[] = [];

  for (const [listId, listName] of Object.entries(LISTAS_MONITORADAS)) {
    const data = await clickupFetch<{ tasks: ClickUpTask[] }>(`/list/${listId}/task`, {
      include_closed: "false",
    });

    for (const task of data.tasks) {
      if (!task.due_date) continue;
      const dueDate = new Date(Number(task.due_date));
      if (dueDate > hoje) continue;
      if (!task.assignees.length) continue;

      for (const assignee of task.assignees) {
        resultados.push({
          id: task.id,
          nome: task.name,
          lista: listName,
          url: task.url,
          dueDate,
          assigneeId: assignee.id,
          assigneeNome: assignee.username,
        });
      }
    }
  }

  return resultados;
}

export function agruparPorResponsavel(tarefas: TarefaAtrasada[]): Map<number, TarefaAtrasada[]> {
  const grupos = new Map<number, TarefaAtrasada[]>();
  for (const tarefa of tarefas) {
    const grupo = grupos.get(tarefa.assigneeId) ?? [];
    grupo.push(tarefa);
    grupos.set(tarefa.assigneeId, grupo);
  }
  return grupos;
}

export function montarMensagemCobranca(nome: string, tarefas: TarefaAtrasada[]): string {
  const linhas = tarefas
    .map((t) => `• *${t.nome}* (${t.lista}) — venceu em ${t.dueDate.toLocaleDateString("pt-BR")}`)
    .join("\n");

  return (
    `Oi, *${nome}*! 👋\n\n` +
    `Você tem ${tarefas.length} tarefa${tarefas.length > 1 ? "s" : ""} atrasada${tarefas.length > 1 ? "s" : ""} no ClickUp:\n\n` +
    `${linhas}\n\n` +
    `Dá pra dar uma olhada e atualizar o status?`
  );
}

export function montarPautaDiaria(tarefas: TarefaAtrasada[]): string {
  if (!tarefas.length) {
    return "Bom dia! ☀️\n\nNenhuma tarefa atrasada no ClickUp hoje. Tudo em dia.";
  }

  const porResponsavel = agruparPorResponsavel(tarefas);
  const secoes = Array.from(porResponsavel.entries())
    .map(([, tarefasDoResponsavel]) => {
      const nome = tarefasDoResponsavel[0].assigneeNome;
      const linhas = tarefasDoResponsavel
        .map((t) => `  • ${t.nome} (${t.lista})`)
        .join("\n");
      return `*${nome}* — ${tarefasDoResponsavel.length} atrasada(s):\n${linhas}`;
    })
    .join("\n\n");

  return `Bom dia! ☀️\n\n📋 *Pauta do dia* — ${tarefas.length} tarefa(s) atrasada(s) no total:\n\n${secoes}`;
}
