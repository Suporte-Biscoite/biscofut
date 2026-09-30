import { createHmac, timingSafeEqual } from "crypto";

/**
 * Sessão da área de administração (/admin).
 *
 * Uma senha só, na variável ADMIN_SENHA da Vercel. O login grava um cookie
 * httpOnly com a validade e uma assinatura HMAC feita com a própria senha —
 * trocar a senha na Vercel derruba todas as sessões abertas. Sem ADMIN_SENHA,
 * a área fica fechada para todo mundo.
 *
 * A área mostra dados pessoais completos (CPF, e-mail, telefone): cada rota
 * de /api/admin confere a sessão antes de qualquer consulta.
 */

export const COOKIE_ADMIN = "futi_admin";
const VALIDADE_HORAS = 8;

function assinar(texto: string, senha: string): string {
  return createHmac("sha256", `admin:${senha}`).update(texto).digest("base64url");
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function senhaAdminConfere(senha: string): boolean {
  const correta = process.env.ADMIN_SENHA;
  return !!correta && iguais(senha, correta);
}

/** Valor do cookie de uma sessão nova, e quantos segundos ele vale. */
export function novaSessaoAdmin(): { valor: string; maxAge: number } {
  const expira = Date.now() + VALIDADE_HORAS * 3_600_000;
  return { valor: `${expira}.${assinar(String(expira), process.env.ADMIN_SENHA!)}`, maxAge: VALIDADE_HORAS * 3600 };
}

export function sessaoAdminValida(request: Request): boolean {
  const senha = process.env.ADMIN_SENHA;
  if (!senha) return false;

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${COOKIE_ADMIN}=`))
    ?.slice(COOKIE_ADMIN.length + 1);
  if (!cookie) return false;

  const [expira, assinatura] = cookie.split(".");
  if (!expira || !assinatura || Number(expira) < Date.now()) return false;
  return iguais(assinatura, assinar(expira, senha));
}
