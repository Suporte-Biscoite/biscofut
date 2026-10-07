/**
 * Chave de acesso da NFC-e (44 dígitos) — pode ir para o navegador.
 *
 * Posições: UF (2) · AAMM da emissão (4) · CNPJ do emitente (14) · modelo (2,
 * 65 = NFC-e, 55 = NF-e) · série (3) · número (9) · tipo de emissão (1) ·
 * código (8) · dígito verificador (1, módulo 11).
 *
 * O QR Code do cupom é um link da SEFAZ com a chave no parâmetro `p`
 * (ex.: https://www.nfce.fazenda.sp.gov.br/qrcode?p=3526…|2|1|1|…); colar o
 * link ou a chave dá no mesmo.
 */


/** Os 44 dígitos da chave, a partir da chave digitada ou do link do QR Code. */
export function extrairChave(texto: string): string | null {
  const doLink = texto.match(/[?&]p=(\d{44})/);
  if (doLink) return doLink[1];
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 44) return digitos;
  const solta = texto.match(/\d{44}/);
  return solta ? solta[0] : null;
}

function digitoVerificador(primeiros43: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = primeiros43.length - 1; i >= 0; i--) {
    soma += Number(primeiros43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export type ChaveNfce = { chave: string; cnpj: string; anoMes: string; numero: string };

/** Valida a chave (dígito verificador e mês). Devolve o erro em português. */
export function validarChave(texto: string, dataCompra?: string): { ok: true; dados: ChaveNfce } | { ok: false; mensagem: string } {
  const chave = extrairChave(texto);
  if (!chave) return { ok: false, mensagem: "Não achei a chave da NFC-e (44 dígitos) no que foi colado." };
  if (digitoVerificador(chave.slice(0, 43)) !== Number(chave[43])) {
    return { ok: false, mensagem: "Chave da NFC-e inválida (dígito verificador não confere). Confira se não faltou ou sobrou número." };
  }
  const cnpj = chave.slice(6, 20);
  // Não confere o CNPJ: as franquias emitem a nota com CNPJ próprio. Quem
  // lança confere no cupom que a loja é Biscoitê.
  const anoMes = `20${chave.slice(2, 4)}-${chave.slice(4, 6)}`;
  if (dataCompra && !dataCompra.startsWith(anoMes)) {
    return { ok: false, mensagem: `A nota é de ${chave.slice(4, 6)}/20${chave.slice(2, 4)}, mas a data da compra informada é outra.` };
  }
  return { ok: true, dados: { chave, cnpj, anoMes, numero: String(Number(chave.slice(25, 34))) } };
}
