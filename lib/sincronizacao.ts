import { campaign } from "./campaign";
import { buscarPedidosDoCliente, situacaoDoPedido, skuParaProduto, type PedidoLoja } from "./iota";
import { calcularNumeros, produtosElegiveis, type ItemCompra } from "./numeroDaSorte";
import { transactionsAllowed } from "./promoStatus";
import { anularPedido, emitirNumerosDoPedido } from "./store";

/**
 * Traz as compras do CPF da IOTA e emite os números das que ainda não foram
 * processadas. Roda no cadastro e em cada login de /meus-numeros — é o
 * "momento de atrelar" os números ao CPF.
 *
 * Idempotente: o pedido fica registrado no banco na primeira vez (PK em
 * pedidos), então rodar de novo não gera nada em dobro. Pedidos que não têm
 * produto participante nem são registrados — se o SKU for cadastrado depois,
 * eles ainda geram números na próxima sincronização.
 */

export type ResultadoSincronizacao =
  | { status: "ok"; pedidosNovos: number; numerosNovos: number; numerosAnulados: number }
  | { status: "bloqueada" } // antes do CA: a promoção não pode gerar números
  | { status: "indisponivel" }; // IOTA fora do ar: mostra o que já está no banco

/**
 * Cadastro e emissão de números só depois do CA — antes disso, só em
 * `next dev`, para dar para testar o fluxo inteiro.
 */
export function participacaoLiberada(): boolean {
  return transactionsAllowed() || process.env.NODE_ENV === "development";
}

/** Compra dentro do período de participação, pela data local da loja. */
function dentroDaVigencia(pedido: PedidoLoja): boolean {
  const dia = pedido.criadoEm.slice(0, 10);
  const { inicio, fim } = campaign.vigencia;
  return (!inicio || dia >= inicio) && (!fim || dia <= fim);
}

const skusValidos = new Set(produtosElegiveis.map((p) => p.sku));

function itensParticipantes(pedido: PedidoLoja, skus: Record<string, string>): ItemCompra[] {
  return pedido.itens
    .map((item) => ({ sku: skus[item.sku] ?? "", quantidade: item.quantidade }))
    .filter((item) => skusValidos.has(item.sku) && item.quantidade > 0);
}

export async function sincronizarPedidos(cpf: string): Promise<ResultadoSincronizacao> {
  if (!participacaoLiberada()) return { status: "bloqueada" };

  let pedidos: PedidoLoja[];
  try {
    ({ pedidos } = await buscarPedidosDoCliente(cpf));
  } catch (erro) {
    console.error("[sincronizacao]", (erro as Error).message);
    return { status: "indisponivel" };
  }

  const skus = skuParaProduto();
  let pedidosNovos = 0;
  let numerosNovos = 0;
  let numerosAnulados = 0;

  // Em ordem de compra: se o teto de 200 cortar, corta as compras mais novas.
  const ordenados = pedidos.filter(dentroDaVigencia).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  for (const pedido of ordenados) {
    const situacao = situacaoDoPedido(pedido.status);
    if (situacao === "cancelado") {
      numerosAnulados += await anularPedido("loja", pedido.id, pedido.status!);
      continue;
    }
    if (situacao === "desconhecido") {
      console.warn(`[sincronizacao] pedido ${pedido.id} com status desconhecido "${pedido.status}" — sem números até ser classificado em lib/iota.ts`);
      continue;
    }

    const solicitados = calcularNumeros(itensParticipantes(pedido, skus));
    if (solicitados === 0) continue;

    const resultado = await emitirNumerosDoPedido({
      cpf,
      origem: "loja",
      referencia: pedido.id,
      loja: pedido.loja,
      compradoEm: pedido.criadoEm,
      statusLoja: pedido.status,
      solicitados,
    });
    if (resultado.status === "emitido") {
      pedidosNovos++;
      numerosNovos += resultado.numeros.length;
    }
  }

  return { status: "ok", pedidosNovos, numerosNovos, numerosAnulados };
}
