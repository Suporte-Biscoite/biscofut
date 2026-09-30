import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

/**
 * Conexão com o Postgres (Neon, pelo Marketplace da Vercel).
 *
 * A integração da Vercel cria `DATABASE_URL` no projeto sozinha. Em
 * desenvolvimento, puxe as variáveis com `vercel env pull .env.local` —
 * de preferência apontando para uma branch de dev do Neon, nunca para o
 * banco de produção (ver README).
 *
 * O pool fica em `globalThis` para sobreviver ao hot-reload do `next dev`
 * (senão cada recompilação abre um pool novo e esgota as conexões), e
 * `attachDatabasePool` avisa a Vercel para fechar conexões ociosas antes de
 * suspender a função.
 */

type DbGlobal = { __campanhaPool?: Pool; __campanhaSchema?: Promise<void> };
const g = globalThis as DbGlobal;

function criarPool(): Pool {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Conecte o banco Neon ao projeto na Vercel e, localmente, rode `vercel env pull .env.local`."
    );
  }

  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 });
  attachDatabasePool(pool);
  return pool;
}

function pool(): Pool {
  return (g.__campanhaPool ??= criarPool());
}

/** Tamanho da série: 5 dígitos, 00000 a 99999 — regulamento, cláusula 6. */
export const TAMANHO_SERIE = 100_000;

/**
 * Esquema do banco. Idempotente, roda uma vez por instância antes da
 * primeira consulta — não há passo manual de migração.
 *
 * - `pool_numeros`: os 100 mil números da série, embaralhados uma única vez
 *   na criação do banco. A emissão pega as próximas posições da fila, o que
 *   dá a distribuição aleatória que o regulamento exige sem nunca repetir
 *   número e sem sorteio a cada compra. A ordem fica gravada: dá para
 *   auditar depois qual número sairia em qual posição.
 * - `contador_numeros`: uma linha só com a próxima posição livre. O
 *   `UPDATE ... RETURNING` trava essa linha, então duas compras simultâneas
 *   nunca pegam a mesma posição.
 * - `pedidos`: PK (origem, referencia) — reenvio do mesmo pedido pela Nexaas
 *   não gera números de novo.
 * - `numeros`: PK no número — um número tem um dono só, garantido pelo
 *   banco.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS participantes (
  cpf           CHAR(11) PRIMARY KEY,
  nome          TEXT,
  email         TEXT,
  senha_hash    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos (
  origem              TEXT NOT NULL,
  referencia          TEXT NOT NULL,
  cpf                 CHAR(11) NOT NULL REFERENCES participantes (cpf),
  numeros_solicitados INT NOT NULL,
  numeros_concedidos  INT NOT NULL DEFAULT 0,
  recebido_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (origem, referencia)
);

CREATE TABLE IF NOT EXISTS pool_numeros (
  posicao INT PRIMARY KEY,
  numero  INT NOT NULL UNIQUE CHECK (numero BETWEEN 0 AND ${TAMANHO_SERIE - 1})
);

CREATE TABLE IF NOT EXISTS contador_numeros (
  id      BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  proximo INT NOT NULL
);

CREATE TABLE IF NOT EXISTS numeros (
  numero     INT PRIMARY KEY REFERENCES pool_numeros (numero),
  cpf        CHAR(11) NOT NULL REFERENCES participantes (cpf),
  origem     TEXT NOT NULL,
  referencia TEXT NOT NULL,
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (origem, referencia) REFERENCES pedidos (origem, referencia)
);

CREATE INDEX IF NOT EXISTS numeros_cpf_idx ON numeros (cpf);

-- Cadastro em /meus-numeros (a compra no PDV só traz CPF e nome).
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS nascimento DATE;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS cadastrado_em TIMESTAMPTZ;
-- Momento em que aceitou regulamento + política (os dois são obrigatórios).
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS aceitou_documentos_em TIMESTAMPTZ;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS aceita_comunicacoes BOOLEAN NOT NULL DEFAULT FALSE;

-- Dados da compra vindos da IOTA, para auditoria.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS loja TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprado_em TIMESTAMPTZ;

-- "Esqueci minha senha": guarda só o hash do token enviado por e-mail.
CREATE TABLE IF NOT EXISTS redefinicoes_senha (
  token_hash TEXT PRIMARY KEY,
  cpf        CHAR(11) NOT NULL REFERENCES participantes (cpf),
  expira_em  TIMESTAMPTZ NOT NULL,
  usado_em   TIMESTAMPTZ,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limite de tentativas (lib/limite.ts). A chave leva o hash do IP, nunca o
-- IP em si, e as linhas são apagadas depois de um dia.
CREATE TABLE IF NOT EXISTS tentativas (
  chave     TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tentativas_chave_idx ON tentativas (chave, criado_em);
`;

async function criarSchema(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    // Serializa instâncias subindo ao mesmo tempo num banco vazio: só uma
    // cria as tabelas e embaralha a série.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('campanha_schema'))");
    await client.query(SCHEMA);

    const { rows } = await client.query<{ total: string }>(
      "SELECT count(*) AS total FROM pool_numeros"
    );
    if (Number(rows[0].total) === 0) {
      await client.query(
        `INSERT INTO pool_numeros (posicao, numero)
         SELECT row_number() OVER (ORDER BY random()) - 1, n
         FROM generate_series(0, ${TAMANHO_SERIE - 1}) AS n`
      );
    }
    await client.query(
      "INSERT INTO contador_numeros (id, proximo) VALUES (TRUE, 0) ON CONFLICT (id) DO NOTHING"
    );
    await client.query("COMMIT");
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}

function garantirSchema(): Promise<void> {
  g.__campanhaSchema ??= criarSchema().catch((erro) => {
    // Falhou (banco fora do ar, por exemplo): deixa a próxima requisição
    // tentar de novo em vez de ficar presa no erro.
    g.__campanhaSchema = undefined;
    throw erro;
  });
  return g.__campanhaSchema;
}

export async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await garantirSchema();
  const { rows } = await pool().query<T>(sql, params);
  return rows;
}

/** Roda `fn` numa transação; desfaz tudo se lançar erro. */
export async function transacao<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await garantirSchema();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}
