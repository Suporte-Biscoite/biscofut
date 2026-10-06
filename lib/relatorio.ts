import { query } from "./db";
import { sincronizarPedidos } from "./sincronizacao";

/**
 * Relatório do /admin e atualização em lote das compras dos cadastrados.
 *
 * O site só conhece quem se cadastrou em Meus Números: a API da IOTA responde
 * "compras deste CPF", não "todos os compradores". Quem comprou e não se
 * cadastrou só aparece num relatório de vendas da Nexaas.
 */

export type Resumo = {
  cadastrados: number;
  comNumeros: number;
  numerosValidos: number;
  numerosAnulados: number;
  pedidos: number;
  pedidosCancelados: number;
  nuncaAtualizados: number;
};

export async function resumo(): Promise<Resumo> {
  const [r] = await query<Record<keyof Resumo, string>>(`
    SELECT
      (SELECT count(*) FROM participantes WHERE cadastrado_em IS NOT NULL) AS "cadastrados",
      (SELECT count(DISTINCT cpf) FROM numeros WHERE anulado_em IS NULL) AS "comNumeros",
      (SELECT count(*) FROM numeros WHERE anulado_em IS NULL) AS "numerosValidos",
      (SELECT count(*) FROM numeros WHERE anulado_em IS NOT NULL) AS "numerosAnulados",
      (SELECT count(*) FROM pedidos) AS "pedidos",
      (SELECT count(*) FROM pedidos WHERE cancelado_em IS NOT NULL) AS "pedidosCancelados",
      (SELECT count(*) FROM participantes WHERE cadastrado_em IS NOT NULL AND sincronizado_em IS NULL) AS "nuncaAtualizados"
  `);
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as Resumo;
}

export type LinhaParticipante = {
  cpf: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  cadastradoEm: string | null;
  sincronizadoEm: string | null;
  pedidos: number;
  numeros: number;
};

/** Todos os cadastrados, mais recentes primeiro. */
export async function listarParticipantes(): Promise<LinhaParticipante[]> {
  const linhas = await query<{
    cpf: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    cidade: string | null;
    uf: string | null;
    cadastrado_em: Date | null;
    sincronizado_em: Date | null;
    pedidos: string;
    numeros: string;
  }>(`
    SELECT p.cpf, p.nome, p.email, p.telefone, p.cidade, p.uf, p.cadastrado_em, p.sincronizado_em,
      (SELECT count(*) FROM pedidos pe WHERE pe.cpf = p.cpf AND pe.cancelado_em IS NULL) AS pedidos,
      (SELECT count(*) FROM numeros n WHERE n.cpf = p.cpf AND n.anulado_em IS NULL) AS numeros
    FROM participantes p
    WHERE p.cadastrado_em IS NOT NULL
    ORDER BY p.cadastrado_em DESC
  `);
  return linhas.map((l) => ({
    cpf: l.cpf,
    nome: l.nome,
    email: l.email,
    telefone: l.telefone,
    cidade: l.cidade,
    uf: l.uf,
    cadastradoEm: l.cadastrado_em?.toISOString() ?? null,
    sincronizadoEm: l.sincronizado_em?.toISOString() ?? null,
    pedidos: Number(l.pedidos),
    numeros: Number(l.numeros),
  }));
}

export type ResultadoLote = {
  consultados: number;
  comNumerosNovos: number;
  numerosNovos: number;
  numerosAnulados: number;
  falhas: number;
  restantes: number;
};

/**
 * Busca na IOTA as compras de até `tamanho` cadastrados, começando pelos que
 * estão há mais tempo sem atualizar (ou nunca atualizados). Poucas consultas
 * em paralelo, para respeitar o rate limit da Nexaas (2.000 a cada 5 min).
 * `corte`: só quem não foi atualizado desde esse momento (o cron usa "1 hora
 * atrás"; o botão do admin usa a hora em que foi clicado, para cada pessoa
 * ser consultada uma vez só na rodada).
 */
export async function sincronizarLote(tamanho: number, corte: Date): Promise<ResultadoLote> {
  const alvos = await query<{ cpf: string }>(
    `SELECT cpf FROM participantes
     WHERE cadastrado_em IS NOT NULL
       AND (sincronizado_em IS NULL OR sincronizado_em < $2)
     ORDER BY sincronizado_em NULLS FIRST
     LIMIT $1`,
    [tamanho, corte]
  );

  const resultado: ResultadoLote = { consultados: 0, comNumerosNovos: 0, numerosNovos: 0, numerosAnulados: 0, falhas: 0, restantes: 0 };
  const fila = alvos.map((a) => a.cpf);
  const SIMULTANEAS = 5;
  await Promise.all(
    Array.from({ length: SIMULTANEAS }, async () => {
      for (let cpf = fila.shift(); cpf; cpf = fila.shift()) {
        const r = await sincronizarPedidos(cpf, { forcar: true });
        resultado.consultados++;
        if (r.status === "ok") {
          resultado.numerosNovos += r.numerosNovos;
          resultado.numerosAnulados += r.numerosAnulados;
          if (r.numerosNovos > 0) resultado.comNumerosNovos++;
        } else if (r.status === "indisponivel") {
          resultado.falhas++;
        }
      }
    })
  );

  const [resto] = await query<{ total: string }>(
    `SELECT count(*) AS total FROM participantes
     WHERE cadastrado_em IS NOT NULL
       AND (sincronizado_em IS NULL OR sincronizado_em < $1)`,
    [corte]
  );
  resultado.restantes = Number(resto.total);
  return resultado;
}

/** CSV (separado por ;, que é o que o Excel em português abre direto). */
export function paraCsv(linhas: LinhaParticipante[]): string {
  const campo = (v: string | number | null) => {
    const texto = v === null ? "" : String(v);
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const data = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
  const cabecalho = ["CPF", "Nome", "E-mail", "Celular", "Cidade", "UF", "Cadastro", "Última atualização", "Pedidos", "Números válidos"];
  const corpo = linhas.map((l) =>
    [l.cpf, l.nome, l.email, l.telefone, l.cidade, l.uf, data(l.cadastradoEm), data(l.sincronizadoEm), l.pedidos, l.numeros]
      .map(campo)
      .join(";")
  );
  return "﻿" + [cabecalho.join(";"), ...corpo].join("\r\n");
}
