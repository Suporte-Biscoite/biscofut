import { campaign } from "./campaign";

/**
 * Status da promoção — o "interruptor mestre" do projeto.
 *
 * A dependência legal do briefing é dura: sem autorização prévia da SPA a
 * campanha não pode começar. Traduzido para software, isso significa que a
 * LP tem que existir em dois estados bem separados, e que o estado
 * transacional só liga depois do CA.
 *
 * - DRAFT      -> nada publicado.
 * - PRE_LAUNCH -> página institucional no ar, ZERO transação: sem cadastro,
 *                 sem número da sorte. Só captura de
 *                 interesse (e-mail), que não é participação.
 * - ACTIVE     -> CA emitido e registrado: fluxo completo liberado.
 *
 * Em produção este valor NUNCA deve ser decidido pelo cliente. Ele vem de
 * uma flag no backend, e cada rota transacional revalida no servidor — ver
 * assertTransactionsAllowed(). Esconder o botão não é controle de acesso.
 */
export type PromoStatus = "DRAFT" | "PRE_LAUNCH" | "ACTIVE";

export const PROMO_STATUS: PromoStatus =
  (process.env.NEXT_PUBLIC_PROMO_STATUS as PromoStatus) ?? "PRE_LAUNCH";

/**
 * Regra única que decide se a mecânica pode rodar. Note que não basta o
 * status: sem número de CA registrado, não há autorização — e a página se
 * recusa a transacionar mesmo que alguém troque a variável de ambiente por
 * engano.
 */
export function transactionsAllowed(status: PromoStatus = PROMO_STATUS): boolean {
  return status === "ACTIVE" && campaign.certificado.numero !== null;
}

/** Guarda para usar no servidor, antes de gravar qualquer participação. */
export function assertTransactionsAllowed(status: PromoStatus = PROMO_STATUS) {
  if (!transactionsAllowed(status)) {
    throw new Error(
      "Promoção não autorizada: participação bloqueada até a emissão e o registro do Certificado de Autorização da SPA/MF."
    );
  }
}
