/**
 * Resultado da Loteria Federal pela API pública do portal de loterias da
 * Caixa — a mesma que o site oficial usa:
 *
 *   GET https://servicebus2.caixa.gov.br/portaldeloterias/api/federal            (último concurso)
 *   GET https://servicebus2.caixa.gov.br/portaldeloterias/api/federal/{concurso}
 *
 * `dezenasSorteadasOrdemSorteio` traz os 5 bilhetes na ordem dos prêmios
 * (1º ao 5º). Não é uma API documentada: se a Caixa mudar ou bloquear, a
 * tela de apuração continua aceitando os 5 prêmios digitados à mão.
 */

const BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api/federal";
/** Federal corre 2 vezes por semana: 30 concursos cobrem uns 3 meses para trás. */
const MAX_VOLTAS = 30;

export type ResultadoFederal = {
  concurso: number;
  /** AAAA-MM-DD */
  data: string;
  premios: [string, string, string, string, string];
};

type RespostaCaixa = {
  numero?: number;
  dataApuracao?: string; // "27/09/2026"
  dezenasSorteadasOrdemSorteio?: string[];
  listaDezenas?: string[];
};

export class ErroLoteria extends Error {}

async function buscarConcurso(concurso?: number): Promise<ResultadoFederal> {
  let resposta: Response;
  try {
    resposta = await fetch(concurso ? `${BASE}/${concurso}` : BASE, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (promocao-futi)" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (erro) {
    throw new ErroLoteria(`Caixa fora do ar ou lenta: ${(erro as Error).message}`);
  }
  if (!resposta.ok) throw new ErroLoteria(`Caixa respondeu HTTP ${resposta.status}.`);

  const corpo = (await resposta.json()) as RespostaCaixa;
  const premios = corpo.dezenasSorteadasOrdemSorteio ?? corpo.listaDezenas ?? [];
  const [dia, mes, ano] = (corpo.dataApuracao ?? "").split("/");
  if (!corpo.numero || premios.length !== 5 || !ano) {
    throw new ErroLoteria("Resposta da Caixa em formato inesperado.");
  }
  return {
    concurso: corpo.numero,
    data: `${ano}-${mes}-${dia}`,
    premios: premios.map((p) => String(p).trim()) as ResultadoFederal["premios"],
  };
}

/**
 * Concurso da Loteria Federal realizado na data (AAAA-MM-DD). Parte do
 * último concurso e volta um a um até achar a data. Devolve null se não
 * houve extração naquele dia (ou se ela ainda não aconteceu).
 */
export async function resultadoDaFederalNoDia(data: string): Promise<ResultadoFederal | null> {
  let atual = await buscarConcurso();
  for (let i = 0; i < MAX_VOLTAS; i++) {
    if (atual.data === data) return atual;
    if (atual.data < data) return null;
    atual = await buscarConcurso(atual.concurso - 1);
  }
  return null;
}
