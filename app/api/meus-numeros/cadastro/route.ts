import { NextResponse } from "next/server";
import { campaign } from "@/lib/campaign";
import {
  ageOn,
  isValidCPF,
  isValidEmail,
  isValidFullName,
  isValidPhone,
  onlyDigits,
} from "@/lib/masks";
import { hashSenha, senhaForte } from "@/lib/senha";
import { participacaoLiberada, sincronizarPedidos } from "@/lib/sincronizacao";
import { buscarParticipante, cadastrarParticipante } from "@/lib/store";
import { respostaComNumeros } from "../resposta";

/**
 * Cadastro em /meus-numeros — o passo "cadastre seu CPF" da mecânica.
 *
 * A compra no PDV só traz CPF e nome (a API da IOTA não devolve e-mail nem
 * telefone), então não há dado da compra para conferir quem está se
 * cadastrando. Vale a regra de promoções desse tipo: o CPF é o
 * identificador, um CPF se cadastra uma vez só, e o prêmio só é entregue ao
 * titular do CPF, com documento. Os dados pedidos são os da cláusula 4 do
 * regulamento.
 *
 * Depois de gravar, já sincroniza as compras do CPF: quem comprou antes de
 * se cadastrar vê os números na hora.
 */
export async function POST(request: Request) {
  let body: {
    nome?: string;
    cpf?: string;
    nascimento?: string;
    email?: string;
    telefone?: string;
    senha?: string;
    aceiteDocumentos?: boolean;
    aceiteComunicacoes?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  if (!participacaoLiberada()) {
    return NextResponse.json(
      { ok: false, mensagem: "O cadastro abre no início da promoção, depois da autorização da SPA/MF." },
      { status: 503 }
    );
  }

  const nome = (body.nome ?? "").trim().replace(/\s+/g, " ");
  const cpf = onlyDigits(body.cpf ?? "");
  const nascimento = body.nascimento ?? "";
  const email = (body.email ?? "").trim().toLowerCase();
  const telefone = onlyDigits(body.telefone ?? "");
  const senha = body.senha ?? "";

  const erro =
    (!isValidFullName(nome) && "Informe seu nome completo.") ||
    (!isValidCPF(cpf) && "CPF inválido.") ||
    (!(ageOn(nascimento, new Date()) >= campaign.regras.idadeMinima) &&
      `A promoção é só para maiores de ${campaign.regras.idadeMinima} anos.`) ||
    (!isValidEmail(email) && "E-mail inválido.") ||
    (!isValidPhone(telefone) && "Telefone inválido.") ||
    (!senhaForte(senha) && "A senha precisa ter pelo menos 6 caracteres.") ||
    (body.aceiteDocumentos !== true &&
      "Para participar, aceite o regulamento e a política de privacidade.");
  if (erro) {
    return NextResponse.json({ ok: false, mensagem: erro }, { status: 422 });
  }

  const criado = await cadastrarParticipante({
    cpf,
    nome,
    email,
    telefone,
    nascimento,
    senhaHash: hashSenha(senha),
    aceitaComunicacoes: body.aceiteComunicacoes === true,
  });
  if (!criado) {
    return NextResponse.json(
      { ok: false, mensagem: "Este CPF já está cadastrado. Use a opção \"Entrar\"." },
      { status: 409 }
    );
  }

  const sincronizacao = await sincronizarPedidos(cpf);
  const participante = await buscarParticipante(cpf);
  return respostaComNumeros(participante!, sincronizacao);
}
