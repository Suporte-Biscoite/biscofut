import { NextResponse } from "next/server";
import { campaign } from "@/lib/campaign";
import { transactionsAllowed } from "@/lib/promoStatus";
import { isValidCPF, onlyDigits } from "@/lib/masks";
import { calcularNumeros, produtosElegiveis, type ItemCompra } from "@/lib/numeroDaSorte";
import { emitirNumerosDoPedido } from "@/lib/store";
import {
  NEXAAS_SKU_PARA_PRODUTO,
  NEXAAS_STATUS_PAGO,
  verificarAssinaturaNexaas,
  type NexaasWebhookEvent,
} from "@/lib/nexaas";

/**
 * Recebe os pedidos pagos da loja (Nexaas) e converte os produtos
 * comprados em números da sorte, por CPF.
 *
 * Sempre respondemos 200 quando o payload é entendido, mesmo que nada seja
 * gerado (evento irrelevante, CPF inválido, pedido já processado) — é assim
 * que se evita a Nexaas ficar reenviando o mesmo webhook indefinidamente.
 * Só devolvemos erro (401/400) quando o problema é nosso lado não conseguir
 * nem entender a requisição — ou 500 quando o banco falha, e aí o reenvio da
 * Nexaas é justamente o que queremos (o pedido não foi registrado).
 *
 * ⚠️  O formato do payload e o header de assinatura ainda são suposição —
 *     ver lib/nexaas.ts. E a checagem de `transactionsAllowed()` abaixo tem
 *     uma implicação operacional real: se a loja começar a vender antes do
 *     CA sair, os pedidos chegam aqui e são recusados. A Nexaas normalmente
 *     desiste de reenviar depois de um número limitado de tentativas — então
 *     antes de a loja abrir, alguém precisa garantir que o CA já foi
 *     registrado, ou esses pedidos vão precisar ser reprocessados na mão.
 */
export async function POST(request: Request) {
  const corpoCru = await request.text();
  const assinatura = request.headers.get("x-nexaas-signature");

  if (!verificarAssinaturaNexaas(corpoCru, assinatura)) {
    return NextResponse.json({ ok: false, mensagem: "Assinatura inválida." }, { status: 401 });
  }

  let evento: NexaasWebhookEvent;
  try {
    evento = JSON.parse(corpoCru);
  } catch {
    return NextResponse.json({ ok: false, mensagem: "JSON inválido." }, { status: 400 });
  }

  const pedido = evento?.data;
  if (!pedido?.id) {
    return NextResponse.json({ ok: false, mensagem: "Payload sem id de pedido." }, { status: 400 });
  }

  if (!NEXAAS_STATUS_PAGO.includes(pedido.status)) {
    return NextResponse.json({ ok: true, ignorado: `status "${pedido.status}" não gera números` });
  }

  if (!transactionsAllowed()) {
    // Aceitamos a existência do pedido, mas registramos que a promoção
    // ainda não pode gerar números — ver aviso no topo do arquivo.
    return NextResponse.json(
      { ok: false, mensagem: "Promoção não autorizada: pedido recebido, mas números não gerados." },
      { status: 503 }
    );
  }

  const cpf = onlyDigits(pedido.customer?.document ?? "");
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, mensagem: "CPF do comprador ausente ou inválido." });
  }

  const skusValidos = new Set(produtosElegiveis.map((p) => p.sku));
  const itens: ItemCompra[] = (pedido.items ?? [])
    .map((item) => ({
      sku: NEXAAS_SKU_PARA_PRODUTO[item.sku] ?? item.sku,
      quantidade: item.quantity,
    }))
    .filter((item) => skusValidos.has(item.sku) && item.quantidade > 0);

  const solicitados = calcularNumeros(itens);
  if (solicitados === 0) {
    return NextResponse.json({ ok: true, ignorado: "nenhum produto participante neste pedido" });
  }

  const resultado = await emitirNumerosDoPedido({
    cpf,
    nome: pedido.customer?.name,
    email: pedido.customer?.email,
    origem: "nexaas",
    referencia: String(pedido.id),
    solicitados,
  });

  if (resultado.status === "ja-processado") {
    return NextResponse.json({ ok: true, ignorado: "pedido já processado" });
  }

  return NextResponse.json({
    ok: true,
    cpf,
    pedido: pedido.id,
    numerosGerados: resultado.numeros.map((n) => n.numero),
    acumulado: resultado.acumulado,
    excedente: resultado.excedente,
  });
}
