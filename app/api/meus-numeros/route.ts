import { NextResponse } from "next/server";
import { excedeuLimite, hashIp, ipDaRequisicao, limparTentativas, MENSAGEM_LIMITE } from "@/lib/limite";
import { isValidCPF, onlyDigits } from "@/lib/masks";
import { verificarSenha } from "@/lib/senha";
import { sincronizarPedidos } from "@/lib/sincronizacao";
import { buscarParticipante } from "@/lib/store";
import { respostaComNumeros } from "./resposta";

/**
 * Login em /meus-numeros: CPF + senha.
 *
 * A senha é criada no cadastro (/api/meus-numeros/cadastro). CPF sozinho
 * (que pode vazar ou ser adivinhado) não abre os números de ninguém.
 *
 * A cada login, antes de responder, busca na IOTA as compras novas do CPF
 * e emite os números delas (lib/sincronizacao.ts).
 *
 * Mensagem de erro sempre igual — CPF sem cadastro ou senha errada — para
 * não revelar qual dos dois é o caso.
 */
const MENSAGEM_ERRO = "CPF ou senha incorretos. Ainda não se cadastrou? Use a opção \"Cadastrar\".";

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

  // Contra força bruta: por IP (um robô testando vários CPFs) e por CPF
  // (várias máquinas tentando a mesma conta). O contador do CPF zera quando
  // o login dá certo, para quem entra várias vezes seguidas não ser barrado.
  const ip = hashIp(ipDaRequisicao(request));
  if (
    await excedeuLimite([
      { chave: `login:ip:${ip}`, maximo: 30, janelaMinutos: 15 },
      { chave: `login:cpf:${cpf}`, maximo: 10, janelaMinutos: 15 },
    ])
  ) {
    return NextResponse.json({ ok: false, mensagem: MENSAGEM_LIMITE }, { status: 429 });
  }

  const participante = await buscarParticipante(cpf);
  const senhaConfere = participante?.senhaHash && verificarSenha(senha, participante.senhaHash);

  if (!participante || !senhaConfere) {
    return NextResponse.json({ ok: false, mensagem: MENSAGEM_ERRO }, { status: 401 });
  }

  await limparTentativas(`login:cpf:${cpf}`);
  const sincronizacao = await sincronizarPedidos(cpf);
  const atualizado = await buscarParticipante(cpf);
  return respostaComNumeros(atualizado!, sincronizacao);
}
