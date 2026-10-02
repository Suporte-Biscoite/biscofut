import { NextResponse } from "next/server";
import { campaign } from "@/lib/campaign";
import { enviarEmail, urlDoSite } from "@/lib/email";
import { excedeuLimite, hashIp, ipDaRequisicao, MENSAGEM_LIMITE } from "@/lib/limite";
import { isValidCPF, onlyDigits } from "@/lib/masks";
import { criarTokenRedefinicao } from "@/lib/store";

/**
 * "Esqueci minha senha": envia um link de redefinição para o e-mail do
 * cadastro.
 *
 * A resposta é a mesma exista o CPF ou não — senão a rota viraria um jeito
 * de descobrir quem está cadastrado na promoção. Pelo mesmo motivo, uma
 * falha no envio do e-mail vai para o log, e não para a tela.
 */
/** O nome vem do cadastro, digitado pela pessoa: nunca vai cru para o HTML. */
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const RESPOSTA =
  "Se houver cadastro com esse CPF, enviamos um link para o e-mail cadastrado. Ele vale por 1 hora — confira também a caixa de spam.";

export async function POST(request: Request) {
  let body: { cpf?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  const cpf = onlyDigits(body.cpf ?? "");
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, mensagem: "CPF inválido." }, { status: 422 });
  }

  const ip = hashIp(ipDaRequisicao(request));
  if (
    await excedeuLimite([
      { chave: `esqueci:ip:${ip}`, maximo: 50, janelaMinutos: 60 },
      { chave: `esqueci:cpf:${cpf}`, maximo: 3, janelaMinutos: 60 },
    ])
  ) {
    return NextResponse.json({ ok: false, mensagem: MENSAGEM_LIMITE }, { status: 429 });
  }

  const redefinicao = await criarTokenRedefinicao(cpf);
  if (redefinicao) {
    const link = `${urlDoSite()}/meus-numeros/redefinir?token=${redefinicao.token}`;
    const saudacao = redefinicao.nome ? `Olá, ${redefinicao.nome.split(" ")[0]}!` : "Olá!";
    try {
      await enviarEmail({
        para: redefinicao.email,
        assunto: `${campaign.nome} — redefinição de senha`,
        texto: `${saudacao}\n\nRecebemos um pedido para redefinir a senha de Meus Números. Para criar uma nova senha, acesse:\n\n${link}\n\nO link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail — sua senha continua a mesma.\n\n${campaign.nome}`,
        html: `<p>${escapar(saudacao)}</p>
<p>Recebemos um pedido para redefinir a senha de <strong>Meus Números</strong>.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#1F3160;color:#FFFFFF;font-weight:700;text-decoration:none">Criar nova senha</a></p>
<p>O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail — sua senha continua a mesma.</p>
<p>${campaign.nome}</p>`,
      });
    } catch (erro) {
      console.error("[esqueci]", (erro as Error).message);
    }
  }

  return NextResponse.json({ ok: true, mensagem: RESPOSTA });
}
