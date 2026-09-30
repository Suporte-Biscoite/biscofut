import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { fichaDoParticipante } from "@/lib/apuracao";
import { isValidCPF, onlyDigits } from "@/lib/masks";

/** GET ?cpf=... — ficha completa do participante, para o atendimento. */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const cpf = onlyDigits(new URL(request.url).searchParams.get("cpf") ?? "");
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, mensagem: "CPF inválido." }, { status: 422 });
  }

  const ficha = await fichaDoParticipante(cpf);
  return NextResponse.json({ ok: true, ficha });
}
