import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { fichaDoParticipante } from "@/lib/apuracao";
import { isValidCPF, onlyDigits } from "@/lib/masks";
import { sincronizarPedidos } from "@/lib/sincronizacao";

/**
 * GET ?cpf=... — ficha completa do participante, para o atendimento.
 *
 * Antes de mostrar, busca as compras na IOTA (sem esperar o intervalo de 5
 * minutos), para o atendimento ver a situação atualizada sem o cliente
 * precisar entrar no site. Só para quem já se cadastrou: quem não aceitou o
 * regulamento não recebe número por uma consulta do admin.
 */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const cpf = onlyDigits(new URL(request.url).searchParams.get("cpf") ?? "");
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ ok: false, mensagem: "CPF inválido." }, { status: 422 });
  }

  let ficha = await fichaDoParticipante(cpf);
  let compras: string | null = null;
  if (ficha?.cadastradoEm) {
    compras = (await sincronizarPedidos(cpf, { forcar: true })).status;
    ficha = await fichaDoParticipante(cpf);
  }
  return NextResponse.json({ ok: true, ficha, compras });
}
