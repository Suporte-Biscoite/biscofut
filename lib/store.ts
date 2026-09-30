/**
 * Registro de participantes e números da sorte, no Postgres (lib/db.ts).
 *
 * O participante se cadastra em /meus-numeros; as compras chegam da API da
 * IOTA (lib/sincronizacao.ts) e cada uma soma números ao CPF, até o teto de
 * 200 números do regulamento (cláusula 6.3) em toda a promoção.
 *
 * As três garantias que o protocolo exige ficam no banco, não no código:
 *   - o mesmo pedido nunca gera números duas vezes (PK em pedidos);
 *   - um número da sorte nunca tem dois donos (PK em numeros);
 *   - o teto por CPF é conferido com a linha do participante travada, então
 *     duas compras simultâneas do mesmo CPF não passam juntas do limite.
 */

import { createHash, randomBytes } from "crypto";
import { query, transacao, TOTAL_NUMEROS } from "./db";
import { aplicarTeto, formatNumeroDaSorte } from "./numeroDaSorte";
import { hashSenha } from "./senha";

/** Compra no PDV das lojas (Nexaas, lida pela API da IOTA). */
export type OrigemNumero = "loja";

export type NumeroEmitido = {
  numero: string;
  origem: OrigemNumero;
  /** Id do pedido no PDV. */
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
 * Cadastro em /meus-numeros. Um CPF só se cadastra uma vez: se a linha já
 * existe com senha, não faz nada e devolve false. Se existe sem senha (o
 * participante de teste, por exemplo), completa os dados. O
 * `WHERE senha_hash IS NULL` no próprio upsert impede que dois cadastros
 * simultâneos do mesmo CPF passem os dois.
 */
export async function cadastrarParticipante(dados: {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  nascimento: string;
  senhaHash: string;
  aceitaComunicacoes: boolean;
}): Promise<boolean> {
  const linhas = await query<{ cpf: string }>(
    `INSERT INTO participantes
       (cpf, nome, email, telefone, nascimento, senha_hash, cadastrado_em,
        aceitou_documentos_em, aceita_comunicacoes)
     VALUES ($1, $2, $3, $4, $5, $6, now(), now(), $7)
     ON CONFLICT (cpf) DO UPDATE SET
       nome = EXCLUDED.nome, email = EXCLUDED.email, telefone = EXCLUDED.telefone,
       nascimento = EXCLUDED.nascimento, senha_hash = EXCLUDED.senha_hash,
       cadastrado_em = now(), aceitou_documentos_em = now(),
       aceita_comunicacoes = EXCLUDED.aceita_comunicacoes, atualizado_em = now()
     WHERE participantes.senha_hash IS NULL
     RETURNING cpf`,
    [
      dados.cpf,
      dados.nome,
      dados.email.trim().toLowerCase(),
      dados.telefone,
      dados.nascimento,
      dados.senhaHash,
      dados.aceitaComunicacoes,
    ]
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
  loja?: string | null;
  compradoEm?: string | null;
  solicitados: number;
}): Promise<ResultadoEmissao> {
  const { cpf, nome, email, origem, referencia, loja, compradoEm, solicitados } = params;

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
      `INSERT INTO pedidos (origem, referencia, cpf, numeros_solicitados, loja, comprado_em)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (origem, referencia) DO NOTHING`,
      [origem, referencia, cpf, solicitados, loja ?? null, compradoEm ?? null]
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
      if (inicio + concedidos > TOTAL_NUMEROS) {
        throw new Error("Números da sorte esgotados em todas as séries.");
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

const VALIDADE_TOKEN_MINUTOS = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * "Esqueci minha senha": gera um token de uso único, válido por 1 hora, e
 * devolve o e-mail cadastrado para enviar o link. O banco guarda só o hash
 * do token — quem ler a tabela não consegue usar os links. Devolve null se o
 * CPF não tem cadastro com e-mail (quem chama responde igual nos dois casos).
 */
export async function criarTokenRedefinicao(
  cpf: string
): Promise<{ token: string; email: string; nome: string | null } | null> {
  const [participante] = await query<{ email: string | null; nome: string | null }>(
    "SELECT email, nome FROM participantes WHERE cpf = $1 AND senha_hash IS NOT NULL",
    [cpf]
  );
  if (!participante?.email) return null;

  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO redefinicoes_senha (token_hash, cpf, expira_em)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [hashToken(token), cpf, VALIDADE_TOKEN_MINUTOS]
  );
  return { token, email: participante.email, nome: participante.nome };
}

/**
 * Troca a senha a partir do token do e-mail. O token vale uma vez só; ao
 * usar, todos os outros tokens pendentes do mesmo CPF também são anulados.
 * Devolve false se o token não existe, venceu ou já foi usado.
 */
export async function redefinirSenhaComToken(token: string, senhaHash: string): Promise<boolean> {
  return transacao(async (client) => {
    const { rows } = await client.query<{ cpf: string }>(
      `UPDATE redefinicoes_senha SET usado_em = now()
       WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > now()
       RETURNING cpf`,
      [hashToken(token)]
    );
    if (rows.length === 0) return false;

    const { cpf } = rows[0];
    await client.query(
      "UPDATE participantes SET senha_hash = $2, atualizado_em = now() WHERE cpf = $1",
      [cpf, senhaHash]
    );
    await client.query(
      "UPDATE redefinicoes_senha SET usado_em = now() WHERE cpf = $1 AND usado_em IS NULL",
      [cpf]
    );
    return true;
  });
}

/**
 * Participante de teste, só em `next dev`: já nasce com senha e números para
 * dar para entrar em /meus-numeros sem ter compra de verdade. É idempotente
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
      origem: "loja",
      referencia: "seed-dev",
      solicitados: 3,
    });
    await cadastrarParticipante({
      cpf: CPF_TESTE,
      nome: "Participante Teste",
      email: "teste@biscoite.com.br",
      telefone: "11999999999",
      nascimento: "1990-01-01",
      senhaHash: hashSenha("teste123"),
      aceitaComunicacoes: false,
    });
  })().catch((erro) => {
    globalSeed.__campanhaSeed = undefined;
    throw erro;
  });
  return globalSeed.__campanhaSeed;
}
