import { NextResponse } from "next/server";
import { rodarVigia } from "@/lib/monitor";

/**
 * Chamado pelo cron da Vercel (vercel.json) a cada 15 minutos. A Vercel manda
 * "Authorization: Bearer <CRON_SECRET>"; sem isso, ninguém de fora dispara.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json(await rodarVigia());
}
