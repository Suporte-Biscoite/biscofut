import { NextResponse } from "next/server";
import { COOKIE_ADMIN, novaSessaoAdmin, senhaAdminConfere, sessaoAdminValida } from "@/lib/admin";
import { excedeuLimite, hashIp, ipDaRequisicao, MENSAGEM_LIMITE } from "@/lib/limite";

/** GET: a sessão ainda vale? (a página /admin pergunta ao abrir) */
export async function GET(request: Request) {
  return NextResponse.json({ ok: sessaoAdminValida(request) });
}

/** POST: entra com a senha de ADMIN_SENHA. */
export async function POST(request: Request) {
  let body: { senha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  const ip = hashIp(ipDaRequisicao(request));
  if (await excedeuLimite([{ chave: `admin:ip:${ip}`, maximo: 10, janelaMinutos: 15 }])) {
    return NextResponse.json({ ok: false, mensagem: MENSAGEM_LIMITE }, { status: 429 });
  }

  if (!senhaAdminConfere(body.senha ?? "")) {
    return NextResponse.json({ ok: false, mensagem: "Senha incorreta." }, { status: 401 });
  }

  const { valor, maxAge } = novaSessaoAdmin();
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_ADMIN, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return resposta;
}
