/**
 * Envio de e-mail transacional pela API da Resend (resend.com), com fetch —
 * sem SDK.
 *
 * Variáveis: RESEND_API_KEY e EMAIL_FROM (ex.: "Promoção Futi
 * <promocaofuti@biscoite.com.br>"). O domínio do remetente precisa estar
 * verificado na Resend (registros DNS de biscoite.com.br).
 *
 * Sem RESEND_API_KEY em `next dev`, o e-mail só é impresso no terminal —
 * dá para testar o fluxo inteiro sem conta na Resend.
 */

export class ErroEmail extends Error {}

export async function enviarEmail(mensagem: {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_FROM;

  if (!chave || !remetente) {
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[email] para ${mensagem.para} — ${mensagem.assunto}\n${mensagem.texto}\n`);
      return;
    }
    throw new ErroEmail("RESEND_API_KEY e EMAIL_FROM não configuradas.");
  }

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente,
      to: [mensagem.para],
      subject: mensagem.assunto,
      text: mensagem.texto,
      html: mensagem.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resposta.ok) {
    throw new ErroEmail(`Resend respondeu HTTP ${resposta.status}: ${await resposta.text()}`);
  }
}

/**
 * Endereço público do site, para os links dos e-mails. Nunca vem do
 * cabeçalho Host da requisição: um atacante poderia forjá-lo e fazer o link
 * de redefinição apontar para o domínio dele.
 */
export function urlDoSite(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
