import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { listarParticipantes, paraCsv } from "@/lib/relatorio";

/** GET — planilha dos cadastrados (CSV para o Excel). */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return new NextResponse(paraCsv(await listarParticipantes()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participantes-promo-futi-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
