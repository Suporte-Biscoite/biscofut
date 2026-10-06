import { NextResponse } from "next/server";
import { sessaoAdminValida } from "@/lib/admin";
import { listarParticipantes, resumo, sincronizarLote } from "@/lib/relatorio";

/** Até 5 min por chamada (lote grande de consultas à IOTA). */
export const maxDuration = 300;

/** GET — resumo e lista dos cadastrados. */
export async function GET(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  const [r, participantes] = await Promise.all([resumo(), listarParticipantes()]);
  return NextResponse.json({ ok: true, resumo: r, participantes });
}

/**
 * POST { desde } — busca na IOTA as compras de um lote de cadastrados que
 * ainda não foram atualizados desde `desde` (hora em que o botão foi clicado).
 */
export async function POST(request: Request) {
  if (!sessaoAdminValida(request)) {
    return NextResponse.json({ ok: false, mensagem: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  let body: { desde?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const desde = new Date(body.desde ?? "");
  const corte = Number.isNaN(desde.getTime()) || desde > new Date() ? new Date() : desde;
  const lote = await sincronizarLote(150, corte);
  return NextResponse.json({ ok: true, lote, resumo: await resumo() });
}
