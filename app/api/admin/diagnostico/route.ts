import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { isValidCPF, onlyDigits } from "@/lib/masks";
import { diagnosticarCpf, estadoDoVigia, rodarVigia } from "@/lib/monitor";

/**
 * GET ?cpf=... — o que a IOTA devolve para o CPF, com a explicação.
 * GET sem cpf — último estado do vigia. POST — roda o vigia agora.
 */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  const cpfBruto = new URL(request.url).searchParams.get("cpf");
  if (cpfBruto === null) {
    return NextResponse.json({ ok: true, vigia: await estadoDoVigia() });
  }
  const cpf = onlyDigits(cpfBruto);
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, mensagem: "CPF inválido." }, { status: 422 });
  }
  return NextResponse.json({ ok: true, diagnostico: await diagnosticarCpf(cpf) });
}

export async function POST(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, vigia: await rodarVigia() });
}
