import { NextResponse } from "next/server";
import { COOKIE_ADMIN } from "@/lib/admin";

export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_ADMIN, "", { httpOnly: true, path: "/", maxAge: 0 });
  return resposta;
}
