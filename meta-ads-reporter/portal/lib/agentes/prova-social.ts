// AGENTE DE PROVA SOCIAL — motor ativo de depoimentos. Toda semana identifica
// clientes que tiveram RESULTADO excelente (CPL bom + volume, via Radar de
// Escala) e sinaliza "hora de pedir depoimento", já com a mensagem pronta pro
// cliente. Transforma todo bom resultado em prova social — o que toda agência
// esquece de fazer sistematicamente. Prova social alimenta a venda de novos.

import { analisarEscala } from "./escala";

const brl = (v: number) => `R$${v.toFixed(2).replace(".", ",")}`;

export type PedidoDepoimento = {
  cliente: string;
  motivo: string;
  mensagemProCliente: string;
};

// Mensagem pronta pro time encaminhar ao cliente pedindo o depoimento,
// no momento quente (logo depois de um bom resultado — maior chance de "sim").
function mensagemDepoimento(cliente: string, conversas: number): string {
  return (
    `Oi! 😃 Passando aqui porque as campanhas estão indo muito bem — ` +
    `${conversas} pessoas chamaram no seu WhatsApp essa semana!\n\n` +
    `Quando o resultado aparece assim, a gente adora registrar 🙌 ` +
    `Você toparia gravar um depoimentozinho rápido (30 segundos, pelo próprio celular) ` +
    `contando como tem sido a experiência e os resultados? Ajuda demais a gente e mostra pra outros empresários que funciona de verdade.\n\n` +
    `Se topar, é só gravar falando naturalmente e me mandar aqui. 🎥`
  );
}

export async function pedidosDeDepoimento(): Promise<PedidoDepoimento[]> {
  const escala = await analisarEscala();
  // Clientes prontos pra escalar = clientes com bom resultado = candidatos quentes.
  return escala
    .filter((o) => o.tipo === "escalar")
    .map((o) => ({
      cliente: o.cliente,
      motivo: `${o.leads7d} conversas na semana a ${brl(o.cpl7d)} — resultado forte, momento quente pra pedir.`,
      mensagemProCliente: mensagemDepoimento(o.cliente, o.leads7d),
    }));
}

export function montarMensagemProvaSocial(pedidos: PedidoDepoimento[]): string {
  if (!pedidos.length) {
    return (
      `⭐ *Prova Social — MPX*\n\n` +
      `Nenhum cliente com resultado de destaque pra pedir depoimento esta semana. ` +
      `Foca em subir a performance que semana que vem tem depoimento novo. 💪`
    );
  }

  const partes: string[] = [
    `⭐ *PROVA SOCIAL — hora de colher depoimento*\n${pedidos.length} cliente(s) tiveram resultado forte essa semana. Momento quente pra pedir (maior chance de "sim").`,
  ];

  for (const p of pedidos) {
    partes.push(
      `👉 *${p.cliente}*\n_${p.motivo}_\n\n` +
        `📋 *Mensagem pronta pra mandar pra ele:*\n${p.mensagemProCliente}`
    );
  }

  partes.push(
    `💡 Depoimento no momento certo (logo depois do resultado) é o que mais converte — e vira material pra fechar cliente novo.`
  );
  return partes.join("\n\n");
}
