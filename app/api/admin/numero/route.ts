import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { donoDoNumero, lerNumero } from "@/lib/apuracao";

/** GET ?serie=3&numero=48213 — quem é o dono do número. */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const url = new URL(request.url);
  const valor = lerNumero(Number(url.searchParams.get("serie")), url.searchParams.get("numero") ?? "");
  if (valor === null) {
    return NextResponse.json({ ok: false, mensagem: "Informe a série (0 a 9) e o número de 5 dígitos." }, { status: 422 });
  }

  const dono = await donoDoNumero(valor);
  return NextResponse.json({ ok: true, dono });
}
