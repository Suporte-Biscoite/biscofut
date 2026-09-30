import { NextResponse } from "next/server";
import { excedeuLimite, hashIp, ipDaRequisicao, MENSAGEM_LIMITE } from "@/lib/limite";
import { hashSenha, senhaForte } from "@/lib/senha";
import { redefinirSenhaComToken } from "@/lib/store";

/** Troca a senha a partir do link enviado por /api/meus-numeros/esqueci. */
export async function POST(request: Request) {
  let body: { token?: string; senha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  const token = body.token ?? "";
  const senha = body.senha ?? "";
  if (!senhaForte(senha)) {
    return NextResponse.json(
      { ok: false, mensagem: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 422 }
    );
  }

  const ip = hashIp(ipDaRequisicao(request));
  if (await excedeuLimite([{ chave: `redefinir:ip:${ip}`, maximo: 20, janelaMinutos: 60 }])) {
    return NextResponse.json({ ok: false, mensagem: MENSAGEM_LIMITE }, { status: 429 });
  }

  if (!token || !(await redefinirSenhaComToken(token, hashSenha(senha)))) {
    return NextResponse.json(
      {
        ok: false,
        mensagem: "Este link venceu ou já foi usado. Peça um novo em \"Esqueci minha senha\".",
      },
      { status: 410 }
    );
  }

  return NextResponse.json({ ok: true });
}
