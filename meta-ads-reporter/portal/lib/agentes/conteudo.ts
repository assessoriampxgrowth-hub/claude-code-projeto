// Banco de ideias de conteúdo por nicho — alimenta o Rodízio de Relacionamento
// com ideias DETALHADAS (formato + gancho + execução) pro cliente escalado na
// semana. Segue o padrão de roteiro MPX: gancho nos 3 primeiros segundos,
// vídeo até 40s, nunca citar telefone/endereço na fala (fica na legenda/CTA).

import { Categoria, CLIENTES_ATIVOS } from "./sazonalidade";

export type IdeiaConteudo = {
  titulo: string;
  formato: "Reels" | "Carrossel" | "Stories" | "Live";
  gancho: string;
  execucao: string;
};

const IDEIAS: Record<Categoria, IdeiaConteudo[]> = {
  alimentacao: [
    {
      titulo: "POV da cozinha no horário de pico",
      formato: "Reels",
      gancho: "\"É assim que nasce o pedido que você faz às 19h47…\"",
      execucao: "Câmera acompanha o prato do pedido chegando até sair pra entrega, cortes rápidos de 1-2s, som ambiente real (chiado, forno). Fechar com o prato pronto em close. CTA: 'pede o seu no link da bio'.",
    },
    {
      titulo: "Antes do molho vs depois do molho",
      formato: "Reels",
      gancho: "\"Tem gente que ainda não conhece esse segredo…\"",
      execucao: "Transição no corte seco: prato simples → prato finalizado com o diferencial da casa (molho, borda, cobertura). 15-20s. Pinar comentário perguntando 'qual você pediria?'.",
    },
    {
      titulo: "Live de lançamento com oferta-relâmpago",
      formato: "Live",
      gancho: "\"Hoje 19h: o combo que não está no cardápio\"",
      execucao: "Live de 30min montando o combo ao vivo; oferta válida só pra quem chamar no WhatsApp durante a live. Aquecer com stories 2 dias antes + disparo na base.",
    },
    {
      titulo: "Cliente reagindo à primeira mordida",
      formato: "Stories",
      gancho: "Enquete: \"Já provou ou ainda está devendo?\"",
      execucao: "3 stories: reação real de cliente (com autorização) → foto do prato → enquete 'já provou?' + caixinha de pedido. Repostar quem marcar a loja.",
    },
  ],
  moda: [
    {
      titulo: "1 peça, 3 looks",
      formato: "Reels",
      gancho: "\"Você compra UMA peça e sai com TRÊS looks…\"",
      execucao: "Transições de troca de look com a mesma peça-base (bater a mão na lente ou pulo no corte). 20s, música em alta. Legenda com preço da peça-base. CTA: 'chama no direct que a gente separa o seu'.",
    },
    {
      titulo: "Provador sincero",
      formato: "Reels",
      gancho: "\"Provando o que chegou HOJE — sem filtro\"",
      execucao: "Vendedora prova 4-5 peças novas em sequência com comentário honesto de caimento ('essa veste maior, pede um número abaixo'). Gera confiança e demanda das peças mostradas.",
    },
    {
      titulo: "Liveshop de novidades",
      formato: "Live",
      gancho: "\"Quinta 19h30: as 10 peças que chegaram — quem tá na live leva com desconto\"",
      execucao: "Live de 40min mostrando peça por peça com preço na tela; 'quero' no WhatsApp reserva. Impulsionar a live com anúncio durante a transmissão (formato do reel do Rei do Tráfego).",
    },
    {
      titulo: "Monte o look da cliente",
      formato: "Stories",
      gancho: "Caixinha: \"Descreve a ocasião que eu monto seu look\"",
      execucao: "Responder 3-4 caixinhas montando looks reais da loja com preço total. Vira série semanal fixa ('Look da Sexta').",
    },
  ],
  veiculos: [
    {
      titulo: "Tour de 30 segundos no carro da semana",
      formato: "Reels",
      gancho: "\"Esse aqui não passa do fim de semana…\"",
      execucao: "Abertura no detalhe mais desejado (roda, painel, ronco do motor), giro externo, interior, quilometragem na tela. Preço só na legenda ou 'chama no WhatsApp'. 30s cravados.",
    },
    {
      titulo: "Quanto custa por mês?",
      formato: "Carrossel",
      gancho: "Capa: \"Esse carro cabe no seu bolso? Faz as contas comigo\"",
      execucao: "Slide 1 foto do carro, slides 2-4 simulação de entrada + parcela (com disclaimer 'sujeito a aprovação'), slide final CTA. Responde a objeção nº1 do comprador local.",
    },
    {
      titulo: "Live do pátio",
      formato: "Live",
      gancho: "\"Sábado 10h: passando por TODOS os carros do pátio ao vivo\"",
      execucao: "Live andando pelo estoque, 2-3min por carro, respondendo perguntas em tempo real. Quem agendar visita na live ganha condição especial. Impulsionar a live com anúncio.",
    },
    {
      titulo: "Chegou hoje (série fixa)",
      formato: "Stories",
      gancho: "\"🚨 ACABOU DE CHEGAR\"",
      execucao: "Todo carro que entra no pátio ganha 3 stories no dia: vídeo externo, interior, e enquete 'quer saber o valor? chama'. Cria hábito de audiência diária.",
    },
  ],
  beleza: [
    {
      titulo: "Transformação em timelapse",
      formato: "Reels",
      gancho: "\"Ela chegou assim… olha como saiu\"",
      execucao: "Timelapse do atendimento completo em 15s + reveal em câmera lenta. Música emocional. Autorização da cliente. CTA: 'agenda pelo link da bio'.",
    },
    {
      titulo: "Erro que estraga seu cabelo",
      formato: "Reels",
      gancho: "\"Se você faz ISSO em casa, para agora\"",
      execucao: "Profissional aponta 1 erro comum e mostra o certo em 30s. Autoridade + salvamentos. Série: 1 erro por semana.",
    },
    {
      titulo: "Bastidor real do salão",
      formato: "Stories",
      gancho: "\"Um dia comigo no salão\"",
      execucao: "6-8 stories ao longo do dia: agenda, produto usado, resultado do dia, caixinha de dúvidas. Humaniza e enche a agenda da semana.",
    },
  ],
  saude: [
    {
      titulo: "Mito ou verdade do consultório",
      formato: "Reels",
      gancho: "\"Isso que te falaram sobre [tema] é MITO\"",
      execucao: "Profissional desmonta 1 mito em 30s, linguagem simples, sem promessa de resultado (compliance de saúde). Fecha com 'dúvidas? manda na caixinha'.",
    },
    {
      titulo: "O que acontece na primeira consulta",
      formato: "Carrossel",
      gancho: "Capa: \"Medo da primeira consulta? Vem ver como funciona\"",
      execucao: "Slides mostrando o passo a passo do atendimento (recepção → avaliação → plano). Quebra a objeção do medo/vergonha que trava agendamento.",
    },
    {
      titulo: "Depoimento com resultado percebido",
      formato: "Reels",
      gancho: "\"O que mudou pra ela depois do tratamento\"",
      execucao: "Paciente conta a experiência (com termo de autorização), foco em qualidade de vida, sem antes/depois proibido pelo conselho da categoria.",
    },
  ],
  presentes: [
    {
      titulo: "Presente de última hora salvo",
      formato: "Reels",
      gancho: "\"Esqueceu o presente? Respira. 24h e eu resolvo\"",
      execucao: "Timelapse da personalização do pedido do zero ao embrulho. Mostrar prazo real. CTA: 'manda o nome no WhatsApp que a gente cria o seu'.",
    },
    {
      titulo: "Reação de quem recebeu",
      formato: "Reels",
      gancho: "\"A reação dela quando abriu…\"",
      execucao: "Vídeo enviado pelo cliente da pessoa abrindo o presente personalizado (pedir na entrega). Prova social pura — o produto vende a emoção.",
    },
    {
      titulo: "Ideias por ocasião",
      formato: "Carrossel",
      gancho: "Capa: \"5 presentes pra quem 'já tem tudo'\"",
      execucao: "1 produto por slide com foto real e faixa de preço. Refazer a cada data sazonal (Dia dos Pais, Dia dos Avós…).",
    },
  ],
  lar: [
    {
      titulo: "Antes e depois do serviço",
      formato: "Reels",
      gancho: "\"Olha o estado que chegou… e como ficou\"",
      execucao: "Corte seco antes → depois (envelopamento, colchão, instalação). 15s. O contraste é o conteúdo. Legenda com o problema que o serviço resolve.",
    },
    {
      titulo: "Quanto tempo dura?",
      formato: "Reels",
      gancho: "\"Todo mundo pergunta: isso dura quanto tempo?\"",
      execucao: "Responder a pergunta mais comum do nicho em 30s com exemplo real. Série 'Pergunta do Cliente' semanal.",
    },
    {
      titulo: "Orçamento sem mistério",
      formato: "Stories",
      gancho: "\"Quanto custa? Depende — te explico em 3 stories\"",
      execucao: "3 stories explicando o que faz o preço variar + CTA de orçamento no WhatsApp. Filtra curioso e atrai lead pronto.",
    },
  ],
  varejo: [
    {
      titulo: "Chegou no estoque (unboxing)",
      formato: "Reels",
      gancho: "\"Abrindo as caixas que chegaram HOJE\"",
      execucao: "Unboxing rápido dos produtos novos com preço na tela. Urgência natural: 'pouca unidade'. CTA pro WhatsApp.",
    },
    {
      titulo: "Top 3 mais vendidos da semana",
      formato: "Carrossel",
      gancho: "Capa: \"O que todo mundo levou essa semana\"",
      execucao: "3 produtos com foto, preço e por que vende. Prova social de manada — o que os outros compram, o público quer.",
    },
    {
      titulo: "Liveshop de ofertas",
      formato: "Live",
      gancho: "\"Ao vivo: ofertas que só valem durante a live\"",
      execucao: "30-40min, produto na mão, preço só na live, reserva pelo WhatsApp. Impulsionar a transmissão com anúncio em tempo real.",
    },
  ],
  servicos: [
    {
      titulo: "Problema que o cliente nem sabia que tinha",
      formato: "Reels",
      gancho: "\"Se você notou ISSO, me chama antes que piore\"",
      execucao: "Mostrar o sinal precoce do problema (barulho, vazamento, desgaste) e o que acontece se ignorar. Medo útil + autoridade. 30s.",
    },
    {
      titulo: "Cliente satisfeito no local",
      formato: "Reels",
      gancho: "\"Terminei o serviço e pedi a opinião dele na hora\"",
      execucao: "Depoimento de 15s gravado na entrega do serviço, espontâneo. Colher toda semana — vira arsenal de prova social.",
    },
    {
      titulo: "Processo por dentro",
      formato: "Carrossel",
      gancho: "Capa: \"Por que o serviço barato sai caro\"",
      execucao: "Comparar o jeito certo (seu processo, materiais) vs o atalho barato. Justifica preço e desarma concorrência por preço.",
    },
  ],
  agro: [
    {
      titulo: "Máquina parada = prejuízo por dia",
      formato: "Reels",
      gancho: "\"Cada dia dessa máquina parada custa mais que a manutenção\"",
      execucao: "Conta simples na tela: custo/dia de máquina parada vs custo da revisão preventiva. Falar a língua do produtor: número.",
    },
    {
      titulo: "Diagnóstico em campo",
      formato: "Reels",
      gancho: "\"Chamaram a gente pra ver ESSE barulho…\"",
      execucao: "Mini-caso real: o problema, o diagnóstico e a solução em 40s. Prova competência técnica melhor que qualquer anúncio.",
    },
  ],
};

// Ideias do nicho do cliente, girando pela semana pra não repetir.
export function ideiasParaCliente(nomeCliente: string, semana: number, qtde = 2): IdeiaConteudo[] {
  const cliente = CLIENTES_ATIVOS.find((c) =>
    nomeCliente.toLowerCase().includes(c.nome.toLowerCase().slice(0, 8)) ||
    c.nome.toLowerCase().includes(nomeCliente.toLowerCase().slice(0, 8))
  );
  const categoria: Categoria = cliente?.categorias[0] ?? "varejo";
  const banco = IDEIAS[categoria] ?? IDEIAS.varejo;
  const out: IdeiaConteudo[] = [];
  for (let i = 0; i < Math.min(qtde, banco.length); i++) {
    out.push(banco[(semana + i) % banco.length]);
  }
  return out;
}

export function formatarIdeia(i: IdeiaConteudo): string {
  return `  🎥 *${i.titulo}* (${i.formato})\n  Gancho: ${i.gancho}\n  Como fazer: ${i.execucao}`;
}
