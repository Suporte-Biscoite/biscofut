import { createHash } from "crypto";
import { query } from "./db";

/**
 * Limite de tentativas por janela de tempo, guardado no Postgres — em
 * serverless não dá para contar em memória, cada requisição pode cair numa
 * instância diferente.
 *
 * Protege o login (força bruta de senha), o cadastro (robô cadastrando CPFs
 * em massa) e o "esqueci minha senha" (disparo de e-mail em massa). Conta por
 * IP e por CPF: por IP pega o robô que troca de CPF; por CPF pega quem troca
 * de IP para atacar a mesma conta.
 */

export type Regra = { chave: string; maximo: number; janelaMinutos: number };

/** IP do visitante, como a Vercel repassa. Só entra no banco como hash. */
export function ipDaRequisicao(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || request.headers.get("x-real-ip") || "desconhecido";
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`futi:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Registra a tentativa em cada regra e devolve true se alguma passou do
 * máximo. A tentativa conta mesmo quando é recusada — insistir não zera a
 * janela.
 */
export async function excedeuLimite(regras: Regra[]): Promise<boolean> {
  let excedeu = false;
  for (const { chave, maximo, janelaMinutos } of regras) {
    const [linha] = await query<{ total: string }>(
      `WITH nova AS (INSERT INTO tentativas (chave) VALUES ($1) RETURNING 1)
       SELECT count(*) + 1 AS total FROM tentativas
       WHERE chave = $1 AND criado_em > now() - make_interval(mins => $2)`,
      [chave, janelaMinutos]
    );
    if (Number(linha.total) > maximo) excedeu = true;
  }

  // Limpeza barata: de vez em quando apaga o que já saiu de qualquer janela.
  if (Math.random() < 0.02) {
    await query("DELETE FROM tentativas WHERE criado_em < now() - interval '1 day'");
  }
  return excedeu;
}

/** Zera a contagem de uma chave — usado quando o login dá certo. */
export async function limparTentativas(chave: string): Promise<void> {
  await query("DELETE FROM tentativas WHERE chave = $1", [chave]);
}

export const MENSAGEM_LIMITE = "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
