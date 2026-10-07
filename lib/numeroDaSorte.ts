import { campaign } from "./campaign";

/**
 * Geração de números da sorte.
 *
 * Regra do briefing: "a cada compra validada, o sistema deve gerar um número
 * da sorte". Aqui isso é modelado como peso por produto — produtos maiores
 * dão mais números —, porque é assim que o regulamento vai declarar.
 *
 * Duas coisas que o front-end NÃO faz, e não deve fazer:
 *
 * 1. Emitir o número. A série é sequencial e única na campanha inteira;
 *    dois navegadores pedindo ao mesmo tempo emitiriam o mesmo número. Só o
 *    banco, com unicidade transacional, pode atribuir. As funções aqui
 *    calculam *quantos* números a compra rende e formatam para exibição.
 * 2. Sortear. A apuração é vinculada à extração da Loteria Federal, como
 *    manda o Decreto 70.951/72 — não é `Math.random()`. Ver sorteio() abaixo.
 */

export type ProdutoElegivel = {
  sku: string;
  /** Identificador de URL — /produtos/[slug]. */
  slug: string;
  nome: string;
  descricao: string;
  /** Números da sorte concedidos por unidade comprada. */
  numerosPorUnidade: number;
  imagem: string;
  imagemLargura: number;
  imagemAltura: number;
};

/**
 * Pesos preliminares — precisam bater exatamente com o regulamento
 * protocolado. Alterar aqui e no regulamento ao mesmo tempo, nunca só aqui.
 */
export const produtosElegiveis: ProdutoElegivel[] = [
  {
    sku: "FUTI-CARD",
    slug: "futi-card",
    nome: "Futi Card",
    descricao:
      "Futi Card com 1 de 23 cards colecionáveis surpresa, acompanhado de biscoitos temáticos.",
    numerosPorUnidade: 1,
    imagem: "/images/produtos/futi-card.webp",
    imagemLargura: 677,
    imagemAltura: 900,
  },
  {
    sku: "FUTI-COL",
    slug: "futi-collection",
    nome: "Futi Player",
    descricao:
      "Blind box com 1 de 6 bonequinhos colecionáveis surpresa, acompanhada de biscoitos temáticos e bolinha.",
    numerosPorUnidade: 6,
    imagem: "/images/produtos/futi-collection.webp",
    imagemLargura: 555,
    imagemAltura: 900,
  },
  {
    sku: "FUTI-ARE",
    slug: "futi-arena",
    nome: "Futi Arena",
    descricao:
      "O set completo: 2 bonequinhos, 2 bolinhas, mini campo e kit de acessórios.",
    numerosPorUnidade: 25,
    imagem: "/images/produtos/futi-arena.webp",
    imagemLargura: 1100,
    imagemAltura: 899,
  },
];

export type ItemCompra = { sku: string; quantidade: number };

/** Quantos números a compra rende, antes do teto por CPF. */
export function calcularNumeros(itens: ItemCompra[]): number {
  return itens.reduce((total, item) => {
    const produto = produtosElegiveis.find((p) => p.sku === item.sku);
    if (!produto) return total;
    return total + produto.numerosPorUnidade * Math.max(0, item.quantidade);
  }, 0);
}

/**
 * Aplica o teto por CPF. Devolve o que será concedido e o que foi cortado —
 * o participante tem que ver o corte na tela, não descobrir depois.
 */
export function aplicarTeto(
  numerosSolicitados: number,
  jaAcumulados: number
): { concedidos: number; excedente: number; restanteApos: number } {
  const teto = campaign.regras.maxNumerosPorCpf;
  const espaco = Math.max(0, teto - jaAcumulados);
  const concedidos = Math.min(numerosSolicitados, espaco);

  return {
    concedidos,
    excedente: numerosSolicitados - concedidos,
    restanteApos: teto - jaAcumulados - concedidos,
  };
}

/**
 * Formato de exibição: série e número de 5 dígitos, com zeros à esquerda —
 * ex.: 348213 vira "3-48213" (série 3, número 48213).
 */
export function formatNumeroDaSorte(valor: number): string {
  const serie = Math.floor(valor / 100_000);
  const numero = String(valor % 100_000).padStart(5, "0");
  return `${serie}-${numero}`;
}

/**
 * Apuração — documentado aqui porque o fluxo precisa constar no protocolo.
 *
 * A cada sorteio mensal, a Loteria Federal sorteia 5 números de concurso —
 * cada um já no formato dos 5 dígitos de um número da sorte, sem composição
 * ou derivação. ⚠️ Com as séries (lib/db.ts), o regulamento precisa definir
 * também qual série é contemplada em cada extração — regra do jurídico. Os 2 ganhadores do mês são os participantes cujo número da
 * sorte corresponde, nesta ordem, ao 1º e ao 2º número sorteado; se ninguém
 * possuir o número correspondente, o critério se estende ao 3º, 4º e 5º
 * números. Persistindo a ausência de contemplado para uma posição, aplica-se
 * a aproximação numérica imediatamente superior ao número de referência (ou
 * imediatamente inferior, quando o de referência for 99999) e, por fim, o
 * resultado da Loteria Federal do sábado imediatamente seguinte.
 *
 * Encontrar "quem possui este número" e aplicar a aproximação depende da
 * base de participantes — fica no backend, com os resultados oficiais como
 * entrada auditável. Esta função só extrai os números de referência do
 * resultado da loteria, na ordem em que devem ser usados na apuração.
 */
export function numerosDeReferenciaPorLoteriaFederal(
  premios: [string, string, string, string, string]
): string[] {
  return premios.map((premio) => premio.replace(/\D/g, "").slice(-5).padStart(5, "0"));
}
