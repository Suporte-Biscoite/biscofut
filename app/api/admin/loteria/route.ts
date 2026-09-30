import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { ErroLoteria, resultadoDaFederalNoDia } from "@/lib/loteria";

/** GET ?data=AAAA-MM-DD — os 5 prêmios da Loteria Federal daquele dia, direto da Caixa. */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const data = new URL(request.url).searchParams.get("data") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ ok: false, mensagem: "Informe a data do sorteio." }, { status: 422 });
  }

  try {
    const resultado = await resultadoDaFederalNoDia(data);
    if (!resultado) {
      return NextResponse.json(
        { ok: false, mensagem: "Não houve extração da Loteria Federal nesta data (ou ela ainda não aconteceu)." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, resultado });
  } catch (erro) {
    const mensagem = erro instanceof ErroLoteria ? erro.message : "Falha ao consultar a Caixa.";
    console.error("[loteria]", mensagem);
    return NextResponse.json(
      { ok: false, mensagem: `Não foi possível buscar na Caixa (${mensagem}). Digite os 5 prêmios à mão.` },
      { status: 502 }
    );
  }
}
