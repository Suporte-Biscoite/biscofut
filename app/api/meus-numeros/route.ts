import { NextResponse } from "next/server";
import { campaign } from "@/lib/campaign";
import { isValidCPF, onlyDigits } from "@/lib/masks";
import { verificarSenha } from "@/lib/senha";
import { buscarParticipante } from "@/lib/store";

/**
 * Login em /meus-numeros: CPF + senha.
 *
 * A senha é criada no primeiro acesso, em /api/meus-numeros/senha, depois de
 * confirmar CPF + e-mail — ver o comentário lá para o porquê. A partir daí,
 * CPF sozinho (que pode vazar ou ser adivinhado) não abre mais os números de
 * ninguém: só quem sabe a senha.
 *
 * Mensagem de erro sempre igual — CPF inexistente, senha errada ou senha
 * ainda não criada — para não revelar qual dos três é o caso.
 */
const MENSAGEM_ERRO = "CPF ou senha incorretos, ou senha ainda não criada.";

export async function POST(request: Request) {
  let body: { cpf?: string; senha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  const cpf = onlyDigits(body.cpf ?? "");
  const senha = body.senha ?? "";

  if (!isValidCPF(cpf) || !senha) {
    return NextResponse.json({ ok: false, mensagem: "Informe CPF e senha." }, { status: 422 });
  }

  const participante = await buscarParticipante(cpf);
  const senhaConfere = participante?.senhaHash && verificarSenha(senha, participante.senhaHash);

  if (!participante || !senhaConfere) {
    return NextResponse.json({ ok: false, mensagem: MENSAGEM_ERRO }, { status: 401 });
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
