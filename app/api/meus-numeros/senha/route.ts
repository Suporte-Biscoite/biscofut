import { NextResponse } from "next/server";
import { campaign } from "@/lib/campaign";
import { isValidCPF, isValidEmail, onlyDigits } from "@/lib/masks";
import { hashSenha, senhaForte } from "@/lib/senha";
import { buscarParticipante, definirSenha } from "@/lib/store";

/**
 * Primeiro acesso a /meus-numeros: cria a senha do participante.
 *
 * Não existe cadastro de senha em nenhum outro lugar — nem no pedido da
 * Nexaas — então a prova de que quem está
 * criando a senha é o dono do CPF é a mesma que já valia antes: CPF + e-mail
 * batendo com o que veio da compra. Uma vez criada, a senha some daqui: só
 * dá para logar por ela em /api/meus-numeros, e essa rota nunca mais deixa
 * definir outra (ver `definirSenha` em lib/store.ts) — sem fluxo de "esqueci
 * minha senha" ainda, é para o time saber que precisa suportar isso via
 * e-mail transacional antes de divulgar a página.
 */
export async function POST(request: Request) {
  let body: { cpf?: string; email?: string; senha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  const cpf = onlyDigits(body.cpf ?? "");
  const email = (body.email ?? "").trim().toLowerCase();
  const senha = body.senha ?? "";

  if (!isValidCPF(cpf) || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, mensagem: "Informe um CPF e um e-mail válidos." },
      { status: 422 }
    );
  }
  if (!senhaForte(senha)) {
    return NextResponse.json(
      { ok: false, mensagem: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 422 }
    );
  }

  const participante = await buscarParticipante(cpf);
  const emailConfere = participante?.email?.trim().toLowerCase() === email;

  if (!participante || !emailConfere) {
    return NextResponse.json(
      {
        ok: false,
        mensagem:
          "Não encontramos números da sorte para os dados informados. Confira o CPF e o e-mail usados na compra.",
      },
      { status: 404 }
    );
  }

  if (participante.senhaHash !== null || !(await definirSenha(cpf, hashSenha(senha)))) {
    return NextResponse.json(
      { ok: false, mensagem: "Este CPF já tem senha cadastrada. Use a opção \"Entrar\"." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    nome: participante.nome,
    acumulado: participante.numeros.length,
    limite: campaign.regras.maxNumerosPorCpf,
    numeros: participante.numeros.map((n) => ({
      numero: n.numero,
      origem: n.origem,
      emitidoEm: n.emitidoEm,
    })),
  });
}
