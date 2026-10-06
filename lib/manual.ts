import { campaign } from "./campaign";
import { query } from "./db";
import { skuParaProduto, skusAConfirmar } from "./iota";
import { validarChave } from "./nfce";
import { calcularNumeros, produtosElegiveis, type ItemCompra } from "./numeroDaSorte";
import { anularPedido, emitirNumerosDoPedido, type NumeroEmitido } from "./store";

/**
 * Lançamento manual de compra pelo /admin — para venda feita sem o CPF do
 * cliente no PDV ("Consumidor: não identificado"), que nunca chega pela IOTA.
 * O cliente manda o cupom; o atendimento confere e lança aqui.
 *
 * Proteções:
 * - só para quem já se cadastrou (aceitou o regulamento);
 * - o número do pedido da Nexaas é a referência, a mesma usada quando o pedido
 *   chega pela IOTA: o mesmo pedido nunca gera números duas vezes, nem para
 *   outro CPF, nem se a loja corrigir o cliente depois e ele chegar pela IOTA;
 * - a chave da NFC-e (44 dígitos), quando informada, também não se repete;
 * - compra dentro da vigência, teto de 200 por CPF e composição dos kits;
 * - tudo fica em ajustes_manuais, com o nome de quem lançou.
 */

export type DadosLancamento = {
  cpf: string;
  pedido: string;
  chaveNfce?: string | null;
  /** AAAA-MM-DD */
  data: string;
  loja?: string | null;
  itens: Array<{ sku: string; quantidade: number }>;
  operador: string;
  observacao?: string | null;
};

export type ResultadoLancamento =
  | { ok: true; numeros: NumeroEmitido[]; excedente: number }
  | { ok: false; mensagem: string };

const skusValidos = new Set(produtosElegiveis.map((p) => p.sku));

export async function lancarCompraManual(d: DadosLancamento): Promise<ResultadoLancamento> {
  const pedido = d.pedido.replace(/\D/g, "");
  const operador = d.operador.trim();

  // O número do pedido da Nexaas tem 7 dígitos ou mais (ex.: 4808933) e sai no
  // topo do cupom ("PEDIDO: …"). Não confundir com o número da NFC-e, mais
  // curto: se o pedido for lançado com o número errado e depois chegar pela
  // IOTA com o número certo, os números sairiam duas vezes.
  if (pedido.length < 7) {
    return { ok: false, mensagem: "Use o número do PEDIDO da Nexaas (7 dígitos ou mais, no topo do cupom: \"PEDIDO: …\"), não o número da NFC-e." };
  }
  if (operador.length < 2) return { ok: false, mensagem: "Informe o seu nome (quem está lançando)." };

  const { inicio, fim } = campaign.vigencia;
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data) || (inicio && d.data < inicio) || (fim && d.data > fim) || d.data > hoje) {
    return { ok: false, mensagem: "Data da compra fora do período da promoção." };
  }

  // Chave da NFC-e (ou o link do QR Code do cupom): opcional, mas se vier
  // tem que ser válida, da Biscoitê e do mesmo mês da compra.
  let chave: string | null = null;
  if ((d.chaveNfce ?? "").trim()) {
    const validacao = validarChave(d.chaveNfce!, d.data);
    if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };
    if (validacao.dados.numero === String(Number(pedido))) {
      return { ok: false, mensagem: `${pedido} é o número da NFC-e, não do pedido. Use o número do PEDIDO da Nexaas (topo do cupom).` };
    }
    chave = validacao.dados.chave;
  }

  const [participante] = await query<{ cadastrado: boolean }>(
    "SELECT cadastrado_em IS NOT NULL AS cadastrado FROM participantes WHERE cpf = $1",
    [d.cpf]
  );
  if (!participante?.cadastrado) {
    return { ok: false, mensagem: "Este CPF ainda não se cadastrou em Meus Números. Peça ao cliente para se cadastrar primeiro." };
  }

  const composicao = skuParaProduto();
  const aConfirmar = skusAConfirmar();
  const itens = d.itens.filter((i) => i.sku && i.quantidade > 0);
  if (itens.length === 0) return { ok: false, mensagem: "Informe ao menos um produto." };
  const pendente = itens.find((i) => aConfirmar.has(i.sku) || !(i.sku in composicao));
  if (pendente) {
    return { ok: false, mensagem: `O SKU ${pendente.sku} ainda não tem composição cadastrada — não dá para calcular os números.` };
  }
  const unidades: ItemCompra[] = itens
    .flatMap((i) => composicao[i.sku].map((c) => ({ sku: c.produto, quantidade: i.quantidade * c.unidades })))
    .filter((i) => skusValidos.has(i.sku));
  const solicitados = calcularNumeros(unidades);

  // Pedido já usado: mensagem clara antes de olhar a NFC-e.
  const [jaUsado] = await query<{ cpf: string }>("SELECT cpf FROM pedidos WHERE origem = 'loja' AND referencia = $1", [pedido]);
  if (jaUsado) {
    return {
      ok: false,
      mensagem:
        jaUsado.cpf === d.cpf
          ? `O pedido ${pedido} já gerou números para este CPF.`
          : `O pedido ${pedido} já gerou números para outro CPF. Verifique o cupom.`,
    };
  }

  if (chave) {
    const [usada] = await query<{ cpf: string; pedido: string }>(
      "SELECT cpf, pedido FROM ajustes_manuais WHERE tipo = 'lancamento' AND chave_nfce = $1",
      [chave]
    );
    if (usada) return { ok: false, mensagem: `Esta NFC-e já foi lançada (pedido ${usada.pedido}).` };
  }

  const resultado = await emitirNumerosDoPedido({
    cpf: d.cpf,
    origem: "loja",
    referencia: pedido,
    loja: d.loja?.trim() || null,
    compradoEm: `${d.data}T12:00:00-03:00`,
    statusLoja: "lancamento_manual",
    solicitados,
  });
  if (resultado.status === "ja-processado") {
    const [dono] = await query<{ cpf: string }>("SELECT cpf FROM pedidos WHERE origem = 'loja' AND referencia = $1", [pedido]);
    return {
      ok: false,
      mensagem:
        dono?.cpf === d.cpf
          ? `O pedido ${pedido} já gerou números para este CPF.`
          : `O pedido ${pedido} já gerou números para outro CPF. Verifique o cupom.`,
    };
  }

  await query(
    `INSERT INTO ajustes_manuais (tipo, cpf, pedido, chave_nfce, itens, numeros, operador, observacao)
     VALUES ('lancamento', $1, $2, $3, $4, $5, $6, $7)`,
    [d.cpf, pedido, chave, JSON.stringify(itens), resultado.numeros.length, operador, d.observacao?.trim() || null]
  );
  return { ok: true, numeros: resultado.numeros, excedente: resultado.excedente };
}

/** Anula os números de um pedido (venda cancelada que não chega pela IOTA). */
export async function anularCompraManual(d: {
  cpf: string;
  pedido: string;
  operador: string;
  observacao?: string | null;
}): Promise<{ ok: true; anulados: number } | { ok: false; mensagem: string }> {
  const operador = d.operador.trim();
  if (operador.length < 2) return { ok: false, mensagem: "Informe o seu nome (quem está anulando)." };
  const [p] = await query<{ cpf: string }>("SELECT cpf FROM pedidos WHERE origem = 'loja' AND referencia = $1", [d.pedido]);
  if (!p || p.cpf !== d.cpf) return { ok: false, mensagem: "Pedido não encontrado para este CPF." };

  const anulados = await anularPedido("loja", d.pedido, "anulado_manual");
  await query(
    `INSERT INTO ajustes_manuais (tipo, cpf, pedido, numeros, operador, observacao)
     VALUES ('anulacao', $1, $2, $3, $4, $5)`,
    [d.cpf, d.pedido, anulados, operador, d.observacao?.trim() || null]
  );
  return { ok: true, anulados };
}
