import { campaign } from "./campaign";
import { query, QUANTIDADE_SERIES, TAMANHO_SERIE } from "./db";
import { formatNumeroDaSorte, numerosDeReferenciaPorLoteriaFederal } from "./numeroDaSorte";

/**
 * Consultas da área de administração: quem é o dono de um número, os dados
 * de um CPF e o apoio à apuração do sorteio mensal.
 *
 * A apuração segue a cláusula 7 do regulamento, dentro da série contemplada
 * (a regra de qual série é contemplada é do jurídico — aqui ela é informada
 * por quem apura):
 *
 *   1. dono do número igual ao 1º prêmio da Loteria Federal, depois o do 2º;
 *   2. faltando ganhador, 3º, 4º e 5º prêmios, nessa ordem;
 *   3. faltando ainda, aproximação imediatamente superior ao 1º prêmio, de
 *      forma sucessiva (imediatamente inferior se o 1º for 99999);
 *   4. sem ninguém na série, vale a Loteria do sábado seguinte.
 *
 * Números anulados (compra cancelada) não contam. Um mesmo CPF não é
 * contemplado duas vezes no mesmo sorteio. O resultado é apoio: a apuração
 * oficial é a registrada pela empresa, conferida com o regulamento.
 */

export type DadosGanhador = {
  numero: string;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cidade: string | null;
  uf: string | null;
  cadastradoEm: string | null;
  pedido: { id: string; loja: string | null; compradoEm: string | null; status: string | null };
};

type Linha = {
  numero: number;
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cidade: string | null;
  uf: string | null;
  cadastrado_em: Date | null;
  referencia: string;
  loja: string | null;
  comprado_em: Date | null;
  status: string | null;
};

const SELECT_DONO = `
  SELECT n.numero, n.cpf, p.nome, p.email, p.telefone, p.nascimento, p.cidade, p.uf, p.cadastrado_em,
         n.referencia, pe.loja, pe.comprado_em, pe.status
  FROM numeros n
  JOIN participantes p ON p.cpf = n.cpf
  JOIN pedidos pe ON pe.origem = n.origem AND pe.referencia = n.referencia
  WHERE n.anulado_em IS NULL`;

function paraGanhador(linha: Linha): DadosGanhador {
  return {
    numero: formatNumeroDaSorte(linha.numero),
    cpf: linha.cpf,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    nascimento: linha.nascimento,
    cidade: linha.cidade,
    uf: linha.uf,
    cadastradoEm: linha.cadastrado_em?.toISOString() ?? null,
    pedido: {
      id: linha.referencia,
      loja: linha.loja,
      compradoEm: linha.comprado_em?.toISOString() ?? null,
      status: linha.status,
    },
  };
}

/** "3-48213", "348213" ou série + número separados → valor interno. */
export function lerNumero(serie: number, numero: string): number | null {
  const digitos = numero.replace(/\D/g, "");
  if (!Number.isInteger(serie) || serie < 0 || serie >= QUANTIDADE_SERIES) return null;
  if (digitos.length === 0 || digitos.length > 5) return null;
  return serie * TAMANHO_SERIE + Number(digitos);
}

export async function donoDoNumero(valor: number): Promise<DadosGanhador | null> {
  const [linha] = await query<Linha>(`${SELECT_DONO} AND n.numero = $1`, [valor]);
  return linha ? paraGanhador(linha) : null;
}

export type Contemplado = DadosGanhador & { criterio: string };

export type ResultadoApuracao = {
  serie: number;
  referencias: string[];
  ganhadores: Contemplado[];
  /** Menos ganhadores que o previsto: não há números suficientes na série. */
  incompleto: boolean;
};

export async function apurar(serie: number, premios: string[]): Promise<ResultadoApuracao> {
  const referencias = numerosDeReferenciaPorLoteriaFederal(
    premios as [string, string, string, string, string]
  );
  const precisa = campaign.apuracao.ganhadoresPorSorteio;
  const base = serie * TAMANHO_SERIE;
  const ganhadores: Contemplado[] = [];
  const cpfs = new Set<string>();

  const contemplar = (linha: Linha, criterio: string) => {
    if (ganhadores.length >= precisa || cpfs.has(linha.cpf)) return;
    cpfs.add(linha.cpf);
    ganhadores.push({ ...paraGanhador(linha), criterio });
  };

  // 1º a 5º prêmios, nessa ordem.
  for (const [i, referencia] of referencias.entries()) {
    if (ganhadores.length >= precisa) break;
    const [linha] = await query<Linha>(`${SELECT_DONO} AND n.numero = $1`, [base + Number(referencia)]);
    if (linha) contemplar(linha, `Igual ao ${i + 1}º prêmio da Loteria Federal (${referencia})`);
  }

  // Aproximação a partir do 1º prêmio: para cima; se o 1º for 99999 (ou
  // acabar a série para cima), para baixo.
  const primeiro = Number(referencias[0]);
  const direcoes: Array<"acima" | "abaixo"> = primeiro === TAMANHO_SERIE - 1 ? ["abaixo"] : ["acima", "abaixo"];
  for (const direcao of direcoes) {
    if (ganhadores.length >= precisa) break;
    const linhas = await query<Linha>(
      direcao === "acima"
        ? `${SELECT_DONO} AND n.numero > $1 AND n.numero < $2 ORDER BY n.numero LIMIT 50`
        : `${SELECT_DONO} AND n.numero < $1 AND n.numero >= $2 ORDER BY n.numero DESC LIMIT 50`,
      direcao === "acima" ? [base + primeiro, base + TAMANHO_SERIE] : [base + primeiro, base]
    );
    for (const linha of linhas) {
      contemplar(
        linha,
        `Aproximação ${direcao === "acima" ? "superior" : "inferior"} ao 1º prêmio (${referencias[0]})`
      );
    }
  }

  return { serie, referencias, ganhadores, incompleto: ganhadores.length < precisa };
}

export type FichaParticipante = {
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cidade: string | null;
  uf: string | null;
  cadastradoEm: string | null;
  aceitaComunicacoes: boolean;
  numeros: Array<{ numero: string; pedido: string; anulado: boolean }>;
  pedidos: Array<{
    id: string;
    loja: string | null;
    compradoEm: string | null;
    status: string | null;
    numeros: number;
    cancelado: boolean;
    /** Lançado à mão no admin (lib/manual.ts): quem lançou. */
    lancadoPor: string | null;
  }>;
};

/** Tudo de um CPF, inclusive números anulados — para o atendimento. */
export async function fichaDoParticipante(cpf: string): Promise<FichaParticipante | null> {
  const [p] = await query<{
    cpf: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    nascimento: string | null;
    cidade: string | null;
    uf: string | null;
    cadastrado_em: Date | null;
    aceita_comunicacoes: boolean;
  }>(
    `SELECT cpf, nome, email, telefone, nascimento, cidade, uf, cadastrado_em, aceita_comunicacoes
     FROM participantes WHERE cpf = $1`,
    [cpf]
  );
  if (!p) return null;

  const numeros = await query<{ numero: number; referencia: string; anulado_em: Date | null }>(
    "SELECT numero, referencia, anulado_em FROM numeros WHERE cpf = $1 ORDER BY emitido_em, numero",
    [cpf]
  );
  const pedidos = await query<{
    referencia: string;
    loja: string | null;
    comprado_em: Date | null;
    status: string | null;
    numeros_concedidos: number;
    cancelado_em: Date | null;
    lancado_por: string | null;
  }>(
    `SELECT pe.referencia, pe.loja, pe.comprado_em, pe.status, pe.numeros_concedidos, pe.cancelado_em,
       (SELECT a.operador FROM ajustes_manuais a
         WHERE a.tipo = 'lancamento' AND a.pedido = pe.referencia LIMIT 1) AS lancado_por
     FROM pedidos pe WHERE pe.cpf = $1 ORDER BY pe.comprado_em NULLS LAST, pe.recebido_em`,
    [cpf]
  );

  return {
    cpf: p.cpf,
    nome: p.nome,
    email: p.email,
    telefone: p.telefone,
    nascimento: p.nascimento,
    cidade: p.cidade,
    uf: p.uf,
    cadastradoEm: p.cadastrado_em?.toISOString() ?? null,
    aceitaComunicacoes: p.aceita_comunicacoes,
    numeros: numeros.map((n) => ({
      numero: formatNumeroDaSorte(n.numero),
      pedido: n.referencia,
      anulado: n.anulado_em !== null,
    })),
    pedidos: pedidos.map((pe) => ({
      id: pe.referencia,
      loja: pe.loja,
      compradoEm: pe.comprado_em?.toISOString() ?? null,
      status: pe.status,
      numeros: pe.numeros_concedidos,
      cancelado: pe.cancelado_em !== null,
      lancadoPor: pe.lancado_por,
    })),
  };
}
