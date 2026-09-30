import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { apurar } from "@/lib/apuracao";
import { QUANTIDADE_SERIES } from "@/lib/db";

/** POST { serie, premios: [5 bilhetes da Loteria Federal] } — apoio à apuração. */
export async function POST(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  let body: { serie?: number; premios?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Requisição inválida." }, { status: 400 });
  }

  const serie = Number(body.serie);
  const premios = (body.premios ?? []).map((p) => String(p).replace(/\D/g, ""));
  if (!Number.isInteger(serie) || serie < 0 || serie >= QUANTIDADE_SERIES) {
    return NextResponse.json({ ok: false, mensagem: "Informe a série contemplada (0 a 9)." }, { status: 422 });
  }
  if (premios.length !== 5 || premios.some((p) => p.length < 5 || p.length > 6)) {
    return NextResponse.json(
      { ok: false, mensagem: "Informe os 5 prêmios da Loteria Federal, como aparecem no resultado (ex.: 059074)." },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, resultado: await apurar(serie, premios) });
}
