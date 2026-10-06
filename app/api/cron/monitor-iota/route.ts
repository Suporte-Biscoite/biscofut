import { NextResponse } from "next/server";
import { rodarVigia } from "@/lib/monitor";
import { sincronizarLote } from "@/lib/relatorio";

/**
 * Chamado pelo cron da Vercel (vercel.json) a cada 15 minutos. A Vercel manda
 * "Authorization: Bearer <CRON_SECRET>"; sem isso, ninguém de fora dispara.
 *
 * Além do vigia, atualiza as compras de 50 cadastrados (os que estão há mais
 * tempo sem atualizar, pelo menos 1 hora): os números chegam mesmo para quem
 * não volta ao site. 50 a cada 15 min fica muito abaixo do rate limit da
 * Nexaas.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const vigia = await rodarVigia();
  const lote = vigia.ok ? await sincronizarLote(50, new Date(Date.now() - 60 * 60_000)) : null;
  return NextResponse.json({ vigia, lote });
}
