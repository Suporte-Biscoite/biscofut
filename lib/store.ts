/**
 * Registro de participantes e números da sorte, no Postgres (lib/db.ts).
 *
 * A única entrada é o webhook de pedidos da Nexaas (app/api/webhooks/nexaas):
 * cada compra com CPF soma números ao participante daquele CPF, até o teto
 * de 200 números do regulamento (cláusula 6.3) em toda a promoção.
 *
 * As três garantias que o protocolo exige ficam no banco, não no código:
 *   - o mesmo pedido nunca gera números duas vezes (PK em pedidos);
 *   - um número da sorte nunca tem dois donos (PK em numeros);
 *   - o teto por CPF é conferido com a linha do participante travada, então
 *     duas compras simultâneas do mesmo CPF não passam juntas do limite.
 */

import { query, transacao, TAMANHO_SERIE } from "./db";
import { aplicarTeto, formatNumeroDaSorte } from "./numeroDaSorte";
import { hashSenha } from "./senha";

export type OrigemNumero = "nexaas";

export type NumeroEmitido = {
  numero: string;
  origem: OrigemNumero;
  /** Id do pedido na Nexaas. */
  referencia: string;
  emitidoEm: string;
};

export type Participante = {
  cpf: string;
  nome: string | null;
  email: string | null;
  /** Hash da senha (lib/senha.ts). `null` até o primeiro acesso a /meus-numeros. */
  senhaHash: string | null;
  /** Em ordem de emissão. */
  numeros: NumeroEmitido[];
};

type LinhaNumero = { numero: number; origem: OrigemNumero; referencia: string; emitido_em: Date };

function paraNumeroEmitido(linha: LinhaNumero): NumeroEmitido {
  return {
    numero: formatNumeroDaSorte(linha.numero),
    origem: linha.origem,
    referencia: linha.referencia,
    emitidoEm: linha.emitido_em.toISOString(),
  };
}

export async function buscarParticipante(cpf: string): Promise<Participante | undefined> {
  await garantirParticipanteTeste();

  const [participante] = await query<{
    cpf: string;
    nome: string | null;
    email: string | null;
    senha_hash: string | null;
  }>("SELECT cpf, nome, email, senha_hash FROM participantes WHERE cpf = $1", [cpf]);
  if (!participante) return undefined;

  const numeros = await query<LinhaNumero>(
    `SELECT numero, origem, referencia, emitido_em FROM numeros
     WHERE cpf = $1 ORDER BY emitido_em, numero`,
    [cpf]
  );

  return {
    cpf: participante.cpf,
    nome: participante.nome,
    email: participante.email,
    senhaHash: participante.senha_hash,
    numeros: numeros.map(paraNumeroEmitido),
  };
}

/**
 * Define a senha de um participante que ainda não tem uma — é o "primeiro
 * acesso" de /meus-numeros, feito depois de confirmar CPF + e-mail. O
 * `senha_hash IS NULL` no próprio UPDATE impede que dois primeiros acessos
 * simultâneos troquem a senha um do outro. Devolve false se o participante
 * não existe ou já tem senha.
 */
export async function definirSenha(cpf: string, senhaHash: string): Promise<boolean> {
  const linhas = await query<{ cpf: string }>(
    `UPDATE participantes SET senha_hash = $2, atualizado_em = now()
     WHERE cpf = $1 AND senha_hash IS NULL RETURNING cpf`,
    [cpf, senhaHash]
  );
  return linhas.length === 1;
}

export type ResultadoEmissao =
  | { status: "ja-processado" }
  | {
      status: "emitido";
      numeros: NumeroEmitido[];
      /** Total do CPF depois desta compra. */
      acumulado: number;
      /** Números que a compra renderia, mas o teto por CPF cortou. */
      excedente: number;
    };

/**
 * Registra o pedido e emite os números dele, tudo numa transação só.
 *
 * `solicitados` é o que a compra rende (calcularNumeros); o teto é aplicado
 * aqui dentro, com a linha do participante travada. O pedido fica
 * registrado mesmo quando o teto zera os números — é o histórico da compra.
 */
export async function emitirNumerosDoPedido(params: {
  cpf: string;
  nome?: string | null;
  email?: string | null;
  origem: OrigemNumero;
  referencia: string;
  solicitados: number;
}): Promise<ResultadoEmissao> {
  const { cpf, nome, email, origem, referencia, solicitados } = params;

  return transacao(async (client) => {
    // O upsert trava a linha do participante até o fim da transação.
    await client.query(
      `INSERT INTO participantes (cpf, nome, email) VALUES ($1, $2, $3)
       ON CONFLICT (cpf) DO UPDATE SET
         nome = COALESCE(EXCLUDED.nome, participantes.nome),
         email = COALESCE(EXCLUDED.email, participantes.email),
         atualizado_em = now()`,
      [cpf, nome || null, email?.trim().toLowerCase() || null]
    );

    const pedido = await client.query(
      `INSERT INTO pedidos (origem, referencia, cpf, numeros_solicitados)
       VALUES ($1, $2, $3, $4) ON CONFLICT (origem, referencia) DO NOTHING`,
      [origem, referencia, cpf, solicitados]
    );
    if (pedido.rowCount === 0) return { status: "ja-processado" as const };

    const { rows: contagem } = await client.query<{ total: string }>(
      "SELECT count(*) AS total FROM numeros WHERE cpf = $1",
      [cpf]
    );
    const jaAcumulados = Number(contagem[0].total);
    const { concedidos, excedente } = aplicarTeto(solicitados, jaAcumulados);

    let numeros: NumeroEmitido[] = [];
    if (concedidos > 0) {
      // Reserva `concedidos` posições da fila embaralhada. O UPDATE trava a
      // linha do contador, então compras simultâneas saem uma depois da outra.
      const { rows: reserva } = await client.query<{ inicio: number }>(
        "UPDATE contador_numeros SET proximo = proximo + $1 RETURNING proximo - $1 AS inicio",
        [concedidos]
      );
      const inicio = reserva[0].inicio;
      if (inicio + concedidos > TAMANHO_SERIE) {
        throw new Error("Série de números da sorte esgotada.");
      }

      const { rows } = await client.query<LinhaNumero>(
        `INSERT INTO numeros (numero, cpf, origem, referencia)
         SELECT numero, $1, $2, $3 FROM pool_numeros
         WHERE posicao >= $4 AND posicao < $5
         ORDER BY posicao
         RETURNING numero, origem, referencia, emitido_em`,
        [cpf, origem, referencia, inicio, inicio + concedidos]
      );
      numeros = rows.map(paraNumeroEmitido);

      await client.query(
        "UPDATE pedidos SET numeros_concedidos = $3 WHERE origem = $1 AND referencia = $2",
        [origem, referencia, concedidos]
      );
    }

    return {
      status: "emitido" as const,
      numeros,
      acumulado: jaAcumulados + concedidos,
      excedente,
    };
  });
}

/**
 * Participante de teste, só em `next dev`: já nasce com senha e números para
 * dar para entrar em /meus-numeros sem simular um pedido antes. É idempotente
 * (o pedido "seed-dev" só é processado uma vez) e nunca roda em produção.
 *
 *   CPF:    529.982.247-25
 *   E-mail: teste@biscoite.com.br
 *   Senha:  teste123
 */
const CPF_TESTE = "52998224725";
const globalSeed = globalThis as { __campanhaSeed?: Promise<void> };

function garantirParticipanteTeste(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return Promise.resolve();

  globalSeed.__campanhaSeed ??= (async () => {
    await emitirNumerosDoPedido({
      cpf: CPF_TESTE,
      nome: "Participante Teste",
      email: "teste@biscoite.com.br",
      origem: "nexaas",
      referencia: "seed-dev",
      solicitados: 3,
    });
    await definirSenha(CPF_TESTE, hashSenha("teste123"));
  })().catch((erro) => {
    globalSeed.__campanhaSeed = undefined;
    throw erro;
  });
  return globalSeed.__campanhaSeed;
}
