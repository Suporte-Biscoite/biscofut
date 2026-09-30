/**
 * Cliente da API da IOTA (hub que expõe os pedidos do PDV Nexaas das lojas).
 *
 *   GET {IOTA_API_URL}/get-customer-orders/{cpf}?campaignName={IOTA_CAMPAIGN}
 *   headers: X-API-Key, X-API-Token
 *
 * Devolve o cliente e os pedidos daquele CPF. Só roda no servidor: a chave e
 * o token ficam nas variáveis de ambiente da Vercel, nunca no código.
 *
 * Formato observado em 29/09/2026 (a IOTA ainda vai restringir a resposta
 * aos itens da campanha — hoje lista todos os produtos):
 *
 *   { result, ordersData: { customer: { document, name, id },
 *     orders: [{ id, salesChannelName, createdAt, items: [{ sku, name, quantity }] }] } }
 *
 * Não vem e-mail, telefone nem status do pedido.
 */

const URL_PADRAO = "https://api.hub.iotaapp.com.br/provider/biscoite/campaigns";
const TIMEOUT_MS = 10_000;

/**
 * De: SKU do produto no PDV. Para: SKU usado em produtosElegiveis
 * (lib/numeroDaSorte.ts). Vem da variável IOTA_SKUS, no formato
 * `4001234:FUTI-CARD,4001235:FUTI-COL,4001236:FUTI-ARE` — dá para cadastrar
 * um SKU novo (outra embalagem, outra loja) sem mexer no código.
 *
 * ⚠️ Enquanto a IOTA/comercial não confirmar os SKUs reais, a variável fica
 * vazia e nenhuma compra gera número.
 */
export function skuParaProduto(): Record<string, string> {
  return Object.fromEntries(
    (process.env.IOTA_SKUS ?? "")
      .split(",")
      .map((par) => par.split(":").map((parte) => parte.trim()))
      .filter(([sku, produto]) => sku && produto)
  );
}

export type PedidoLoja = {
  id: string;
  loja: string | null;
  /** Data e hora da compra, com o fuso da loja (ex.: 2026-10-02T19:50:17-03:00). */
  criadoEm: string;
  itens: Array<{ sku: string; nome: string | null; quantidade: number }>;
};

export type ClienteLoja = { nome: string | null; pedidos: PedidoLoja[] };

type RespostaIota = {
  ordersData?: {
    customer?: { document?: string; name?: string | null } | null;
    orders?: Array<{
      id?: string | number;
      salesChannelName?: string | null;
      createdAt?: string;
      items?: Array<{ sku?: string | number; name?: string | null; quantity?: number }> | null;
    }> | null;
  } | null;
};

export class ErroIota extends Error {}

export async function buscarPedidosDoCliente(cpf: string): Promise<ClienteLoja> {
  const chave = process.env.IOTA_API_KEY;
  const token = process.env.IOTA_API_TOKEN;
  if (!chave || !token) {
    throw new ErroIota("IOTA_API_KEY e IOTA_API_TOKEN não configuradas.");
  }

  const base = process.env.IOTA_API_URL ?? URL_PADRAO;
  const campanha = process.env.IOTA_CAMPAIGN ?? "NEYMARJR";
  const url = `${base}/get-customer-orders/${cpf}?campaignName=${encodeURIComponent(campanha)}`;

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { "X-API-Key": chave, "X-API-Token": token, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (erro) {
    throw new ErroIota(`IOTA fora do ar ou lenta: ${(erro as Error).message}`);
  }

  // CPF sem pedidos volta 200 com a lista vazia (conferido em 29/09/2026);
  // o 404 fica tratado igual, por garantia.
  if (resposta.status === 404) return { nome: null, pedidos: [] };
  if (!resposta.ok) {
    throw new ErroIota(`IOTA respondeu HTTP ${resposta.status}.`);
  }

  const corpo = (await resposta.json()) as RespostaIota;
  const dados = corpo.ordersData;

  return {
    nome: dados?.customer?.name?.trim() || null,
    pedidos: (dados?.orders ?? [])
      .filter((pedido) => pedido.id !== undefined && pedido.createdAt)
      .map((pedido) => ({
        id: String(pedido.id),
        loja: pedido.salesChannelName ?? null,
        criadoEm: pedido.createdAt!,
        itens: (pedido.items ?? []).map((item) => ({
          sku: String(item.sku ?? ""),
          nome: item.name ?? null,
          quantidade: Number(item.quantity ?? 0),
        })),
      })),
  };
}
