import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { lancarCompraManual, type DadosLancamento } from "@/lib/manual";
import { isValidCPF, onlyDigits } from "@/lib/masks";

/** POST — lança à mão uma compra feita sem CPF no PDV (ver lib/manual.ts). */
export async function POST(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  let body: Partial<DadosLancamento>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }
  const cpf = onlyDigits(body.cpf ?? "");
  if (!isValidCPF(cpf)) return NextResponse.json({ ok: false, mensagem: "CPF inválido." }, { status: 422 });

  const r = await lancarCompraManual({
    cpf,
    pedido: String(body.pedido ?? ""),
    chaveNfce: body.chaveNfce ?? null,
    data: String(body.data ?? ""),
    loja: body.loja ?? null,
    itens: (body.itens ?? []).map((i) => ({ sku: String(i.sku ?? ""), quantidade: Number(i.quantidade) || 0 })),
    operador: String(body.operador ?? ""),
    observacao: body.observacao ?? null,
  });
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
}
