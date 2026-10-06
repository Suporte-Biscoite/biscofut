import { campaign } from "./campaign";
import { query } from "./db";
import {
  buscarPedidosDoCliente,
  situacaoDoPedido,
  skuParaProduto,
  skusAConfirmar,
  type Composicao,
  type PedidoLoja,
} from "./iota";
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
  | { status: "recente" } // consultado há pouco: mostra o que já está no banco
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

/** Cada item do PDV vira as unidades de produto participante que ele contém (kits). */
function itensParticipantes(pedido: PedidoLoja, skus: Record<string, Composicao>): ItemCompra[] {
  return pedido.itens
    .flatMap((item) =>
      (skus[item.sku] ?? []).map(({ produto, unidades }) => ({
        sku: produto,
        quantidade: item.quantidade * unidades,
      }))
    )
    .filter((item) => skusValidos.has(item.sku) && item.quantidade > 0);
}

/**
 * Intervalo mínimo entre duas consultas à IOTA para o mesmo CPF. Cada
 * consulta vira uma chamada à listagem de pedidos da Nexaas, que tem rate
 * limit: quem entra várias vezes seguidas não multiplica as chamadas. Uma
 * compra nova aparece em até esse intervalo. IOTA_INTERVALO_MINUTOS muda o
 * valor (0 desliga — usado nos testes).
 */
function intervaloMinutos(): number {
  const texto = process.env.IOTA_INTERVALO_MINUTOS?.trim();
  const valor = texto ? Number(texto) : NaN;
  return Number.isFinite(valor) && valor >= 0 ? valor : 5;
}

/**
 * Marca o CPF como consultado agora, se a última consulta foi há mais que o
 * intervalo. Atômico: dois logins simultâneos do mesmo CPF não consultam os
 * dois. Devolve false se ainda está dentro do intervalo.
 */
async function reservarConsulta(cpf: string): Promise<boolean> {
  const linhas = await query<{ cpf: string }>(
    `UPDATE participantes SET sincronizado_em = now()
     WHERE cpf = $1
       AND (sincronizado_em IS NULL OR sincronizado_em <= now() - make_interval(mins => $2))
     RETURNING cpf`,
    [cpf, intervaloMinutos()]
  );
  return linhas.length === 1;
}

/**
 * `forcar`: ignora o intervalo de 5 minutos — usado pelo atendimento no
 * /admin, que precisa da situação atualizada na hora.
 */
export async function sincronizarPedidos(
  cpf: string,
  { forcar = false }: { forcar?: boolean } = {}
): Promise<ResultadoSincronizacao> {
  if (!participacaoLiberada()) return { status: "bloqueada" };
  if (forcar) {
    await query("UPDATE participantes SET sincronizado_em = now() WHERE cpf = $1", [cpf]);
  } else if (!(await reservarConsulta(cpf))) {
    return { status: "recente" };
  }

  let pedidos: PedidoLoja[];
  try {
    ({ pedidos } = await buscarPedidosDoCliente(cpf));
  } catch (erro) {
    console.error("[sincronizacao]", (erro as Error).message);
    // Não conta como consulta feita: o próximo login tenta de novo.
    await query("UPDATE participantes SET sincronizado_em = NULL WHERE cpf = $1", [cpf]);
    return { status: "indisponivel" };
  }

  const skus = skuParaProduto();
  const aConfirmar = skusAConfirmar();
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
    }
    if (situacao === "pendente" || situacao === "desconhecido") continue;

    // Kit sem composição confirmada: o pedido espera inteiro (ver lib/iota.ts).
    const pendente = pedido.itens.find((item) => aConfirmar.has(item.sku));
    if (pendente) {
      console.warn(`[sincronizacao] pedido ${pedido.id} aguardando composição do kit ${pendente.sku}`);
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
