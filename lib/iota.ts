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
 *     orders: [{ id, status, salesChannelName, createdAt, items: [{ sku, name, quantity }] }] } }
 *
 * Não vem e-mail nem telefone. O `status` foi incluído pela IOTA em
 * 30/09/2026 — ver situacaoDoPedido abaixo.
 */

const URL_PADRAO = "https://api.hub.iotaapp.com.br/provider/biscoite/campaigns";
const TIMEOUT_MS = 10_000;

/**
 * De: SKU do PDV. Para: quantas unidades de cada produto participante
 * (lib/numeroDaSorte.ts) vêm dentro dele. Os números da sorte saem por
 * unidade: "Futi Card Dupla" são 2 Cards, logo 2 números por kit vendido.
 *
 * SKUs avulsos confirmados em 29/09/2026; kits em 06/10/2026. Kit que não
 * está aqui não gera número — e o pedido nem é registrado, então quando ele
 * for cadastrado as compras anteriores geram números no próximo login. Não
 * cadastrar kit com composição duvidosa: pedido que já gerou número não é
 * recalculado.
 *
 * A variável IOTA_SKUS, se preenchida, acrescenta ou substitui SKUs sem
 * mexer no código — formato `sku:PRODUTO*unidades+PRODUTO*unidades`,
 * separados por vírgula. Ex.: `5000025:FUTI-CARD*6+FUTI-COL*1+FUTI-ARE*1`.
 * O `*1` pode ser omitido (`4001292:FUTI-CARD`).
 */
export type Composicao = Array<{ produto: string; unidades: number }>;

const CARD = (unidades = 1): Composicao => [{ produto: "FUTI-CARD", unidades }];
const COL = (unidades = 1): Composicao => [{ produto: "FUTI-COL", unidades }];
const ARE = (unidades = 1): Composicao => [{ produto: "FUTI-ARE", unidades }];

const SKUS_PADRAO: Record<string, Composicao> = {
  // Avulsos
  "4001292": CARD(), // Futi Card
  "4001293": COL(), // Futi Collection
  "4001261": ARE(), // Futi Arena

  // Kits com a composição clara pelo nome
  "5000003": CARD(2), // Futi Card Dupla
  "5000004": CARD(), // Futi Card + Decorado Astronauta Menino
  "5000005": CARD(), // Futi Card + Decorado Astronauta Menina
  "5000006": CARD(), // Futi Card + Decorado Unicórnio
  "5000007": CARD(), // Futi Card + Decorado Dinossauro
  "5000008": CARD(), // Futi Card + Caixa Limone 200g
  "5000009": CARD(3), // Futi Card Trio
  "5000010": CARD(6), // Futi Card Caixa 6
  "5000014": COL(), // Futi Collection + Caixa Laranje 200g
  "5000015": COL(3), // Futi Collection Trio

  // ⚠️ A confirmar a composição antes de cadastrar:
  // 5000011 Futi Card Pack Holo, 5000012 Drop Futi Card Caixa Ouro,
  // 5000013 Futi Collection Live, 5000016 Futi Arena Live,
  // 5000018 Kit Craque, 5000019 Kit Pai & Filho, 5000020 Kit Mãe & Filhos,
  // 5000021 Kit Dia das Crianças, 5000022 Kit Cards Completo,
  // 5000024 Kit Bonecos Collection Completo, 5000025 Kit Completo Neymar Futi,
  // 5000026 Kit Jogue com os Amigos, 5000027 Kit Compartilhar,
  // 5000028 Drop Futi Arena Edição Assinada.
};

/**
 * Kits da campanha que ainda não têm a composição confirmada. Pedido com
 * qualquer um deles fica em espera inteiro (não gera nem os itens conhecidos):
 * quando o kit for cadastrado acima (ou em IOTA_SKUS), o pedido gera tudo de
 * uma vez. Se gerasse só a parte conhecida, o pedido ficaria registrado e os
 * números do kit nunca sairiam.
 */
const SKUS_A_CONFIRMAR = [
  "5000011", "5000012", "5000013", "5000016", "5000018", "5000019", "5000020",
  "5000021", "5000022", "5000024", "5000025", "5000026", "5000027", "5000028",
];

/** SKUs a confirmar que ainda não ganharam composição (no código ou na variável). */
export function skusAConfirmar(): Set<string> {
  const cadastrados = skuParaProduto();
  return new Set(SKUS_A_CONFIRMAR.filter((sku) => !(sku in cadastrados)));
}

/** "FUTI-CARD*6+FUTI-COL" → composição; null se o texto não fizer sentido. */
function lerComposicao(texto: string): Composicao | null {
  const partes = texto.split("+").map((parte) => {
    const [produto, unidades = "1"] = parte.split("*").map((x) => x.trim());
    return { produto, unidades: Number(unidades) };
  });
  return partes.every((p) => p.produto && Number.isInteger(p.unidades) && p.unidades > 0) ? partes : null;
}

export function skuParaProduto(): Record<string, Composicao> {
  const extras = (process.env.IOTA_SKUS ?? "")
    .split(",")
    .map((par) => {
      const [sku, composicao] = par.split(":").map((parte) => parte?.trim());
      return [sku, composicao ? lerComposicao(composicao) : null] as const;
    })
    .filter((par): par is readonly [string, Composicao] => !!par[0] && par[1] !== null);
  return { ...SKUS_PADRAO, ...Object.fromEntries(extras) };
}

/**
 * O que fazer com o pedido conforme o status — lista oficial enviada pela
 * IOTA em 30/09/2026.
 *
 * - valido: venda finalizada, gera números. A venda de loja já chega como
 *   "delivered"; no e-commerce, esperar a entrega evita dar número para
 *   compra que ainda pode ser cancelada.
 * - cancelado: anula os números que o pedido tiver gerado.
 * - pendente: ainda em andamento (faturado, em separação, em rota,
 *   cancelamento ou devolução pendente…). Não gera nem anula; o pedido é
 *   reavaliado a cada sincronização até chegar num estado final.
 *   "partially_cancelled" fica aqui porque a API não diz quais itens saíram.
 * - desconhecido: fora da lista oficial — tratado como pendente, com aviso no
 *   log para ser classificado aqui.
 */
const STATUS_VALIDOS = new Set(["delivered", "delivered_waiting_stock", "rejected_return"]);
const STATUS_CANCELADOS = new Set(["cancelled", "full_return", "send_returned", "accepted_return"]);
const STATUS_PENDENTES = new Set([
  "new",
  "processing_nfe",
  "nfe_issued",
  "waiting_picking",
  "pre_order",
  "picked",
  "packed",
  "pack_label_generated",
  "separated",
  "transporting",
  "delivery_route",
  "waiting_withdrawal",
  "waiting_stock",
  "canceling_nfe",
  "pending_cancel",
  "pending_return",
  "pending_return_invoice",
  "partially_cancelled",
  "problem_reported",
  "invoice_error",
  "delivery_problem",
]);

export type SituacaoPedido = "valido" | "cancelado" | "pendente" | "desconhecido";

export function situacaoDoPedido(status: string | null): SituacaoPedido {
  // Sem status: a API antiga não mandava o campo, e só listava vendas feitas.
  if (!status) return "valido";
  if (STATUS_VALIDOS.has(status)) return "valido";
  if (STATUS_CANCELADOS.has(status)) return "cancelado";
  if (STATUS_PENDENTES.has(status)) return "pendente";
  return "desconhecido";
}

export type PedidoLoja = {
  id: string;
  /** Status no PDV (ex.: "delivered"). `null` se a API não mandar. */
  status: string | null;
  loja: string | null;
  /** Data e hora da compra, com o fuso da loja (ex.: 2026-10-02T19:50:17-03:00). */
  criadoEm: string;
  itens: Array<{ sku: string; nome: string | null; quantidade: number }>;
};

export type ClienteLoja = {
  nome: string | null;
  pedidos: PedidoLoja[];
  /** Texto `result` da IOTA — explica por que veio vazio (ex.: filtro da campanha). */
  mensagem: string | null;
};

type RespostaIota = {
  result?: string;
  ordersData?: {
    customer?: { document?: string; name?: string | null } | null;
    orders?: Array<{
      id?: string | number;
      status?: string | null;
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
  if (resposta.status === 404) return { nome: null, pedidos: [], mensagem: "HTTP 404" };
  if (!resposta.ok) {
    throw new ErroIota(`IOTA respondeu HTTP ${resposta.status}.`);
  }

  const corpo = (await resposta.json()) as RespostaIota;
  const dados = corpo.ordersData;

  return {
    nome: dados?.customer?.name?.trim() || null,
    mensagem: corpo.result ?? null,
    // Sem pedido, a IOTA às vezes manda um pedido "vazio" (id 0, sem data).
    pedidos: (dados?.orders ?? [])
      .filter((pedido) => pedido.id !== undefined && pedido.id !== 0 && pedido.createdAt)
      .map((pedido) => ({
        id: String(pedido.id),
        status: pedido.status?.trim().toLowerCase() || null,
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
