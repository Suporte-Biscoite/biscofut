import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { anularCompraManual } from "@/lib/manual";
import { onlyDigits } from "@/lib/masks";

/** POST { cpf, pedido, operador, observacao } — anula os números de um pedido. */
export async function POST(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  let body: { cpf?: string; pedido?: string; operador?: string; observacao?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }
  const r = await anularCompraManual({
    cpf: onlyDigits(body.cpf ?? ""),
    pedido: String(body.pedido ?? ""),
    operador: String(body.operador ?? ""),
    observacao: body.observacao ?? null,
  });
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
}
