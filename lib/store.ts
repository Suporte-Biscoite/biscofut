/**
 * Registro de participantes e números da sorte — compartilhado entre os dois
 * canais de entrada da campanha: o cadastro manual de nota fiscal
 * (app/api/participacao) e o webhook de pedidos da Nexaas
 * (app/api/webhooks/nexaas). Os dois alimentam o mesmo participante por CPF,
 * porque o teto de 200 números do regulamento (cláusula 6.3) é por CPF em
 * toda a promoção, não por canal.
 *
 * ⚠️  STUB EM MEMÓRIA — E MESMO ASSIM, SÓ SERVE PARA UM PROCESSO SÓ. Cada
 *     rota de API do Next (app/api/.../route.ts) é compilada como um módulo
 *     separado; em produção na Vercel, cada rota vira uma função serverless
 *     independente. Isso quer dizer duas coisas:
 *
 *     1. Sem o truque de guardar o estado em `globalThis` (abaixo), este Map
 *        nem *dentro do mesmo `next dev`* seria compartilhado entre rotas —
 *        cada uma teria a sua própria cópia, e o webhook da Nexaas nunca
 *        apareceria na consulta de /api/meus-numeros. O truque resolve isso
 *        localmente.
 *     2. Ele NÃO resolve produção na Vercel: cada invocação de função
 *        serverless pode cair numa instância de processo diferente (e cold
 *        starts zeram a memória de qualquer jeito). Ou seja, isto continua
 *        sendo só para provar o fluxo — antes de ir ao ar, isto precisa
 *        virar uma tabela real, com:
 *          - UNIQUE em (cpf) para o participante;
 *          - UNIQUE em (origem, referencia) para o registro de cada compra —
 *            é o que impede a Nexaas gerar números duas vezes num reenvio de
 *            webhook, e a nota fiscal ser cadastrada duas vezes;
 *          - emissão do número da sorte dentro de uma transação com o
 *            incremento do sequencial, senão dois pedidos simultâneos
 *            recebem o mesmo número.
 *     Ver FLUXO.md §6.
 */

import { hashSenha } from "./senha";

export type OrigemNumero = "nota-fiscal" | "nexaas";

export type NumeroEmitido = {
  numero: string;
  origem: OrigemNumero;
  /** Chave de acesso da nota (fluxo manual) ou id do pedido (fluxo Nexaas). */
  referencia: string;
  emitidoEm: string;
};

export type Participante = {
  cpf: string;
  nome: string | null;
  email: string | null;
  /** Hash da senha (lib/senha.ts). `null` até o primeiro acesso a /meus-numeros. */
  senhaHash: string | null;
  numeros: NumeroEmitido[];
};

type StoreGlobal = {
  __campanhaStore?: {
    participantes: Map<string, Participante>;
    referenciasProcessadas: Set<string>;
    proximoSequencial: number;
  };
};

// `globalThis` sobrevive entre módulos recompilados independentemente
// dentro do mesmo processo Node — é o mesmo truque usado para não recriar o
// PrismaClient a cada hot-reload em dev. Sem isso, cada rota de API teria a
// sua própria cópia do Map (ver aviso acima).
const g = globalThis as StoreGlobal;
const estado = (g.__campanhaStore ??= {
  participantes: new Map<string, Participante>(),
  referenciasProcessadas: new Set<string>(),
  proximoSequencial: 1,
});

const participantes = estado.participantes;
const referenciasProcessadas = estado.referenciasProcessadas;

function chaveReferencia(origem: OrigemNumero, referencia: string): string {
  return `${origem}:${referencia}`;
}

/** Evita gerar números duas vezes para a mesma nota ou o mesmo pedido. */
export function referenciaJaProcessada(origem: OrigemNumero, referencia: string): boolean {
  return referenciasProcessadas.has(chaveReferencia(origem, referencia));
}

export function acumuladoPorCpf(cpf: string): number {
  return participantes.get(cpf)?.numeros.length ?? 0;
}

export function buscarParticipante(cpf: string): Participante | undefined {
  return participantes.get(cpf);
}

/**
 * Define a senha de um participante que ainda não tem uma — é o "primeiro
 * acesso" de /meus-numeros, feito depois de confirmar CPF + e-mail. Se o
 * participante não existe ou já tem senha, não faz nada (quem chama decide
 * a mensagem: "não encontramos" ou "já existe senha, faça login").
 */
export function definirSenha(cpf: string, senhaHash: string): boolean {
  const participante = participantes.get(cpf);
  if (!participante || participante.senhaHash !== null) return false;

  participante.senhaHash = senhaHash;
  return true;
}

/**
 * Registra `quantidade` números novos para o CPF, já respeitando o teto
 * (quem chama decide `quantidade` a partir de aplicarTeto). Atualiza nome e
 * e-mail se vierem preenchidos, sem apagar o que já existia.
 */
export function registrarNumeros(params: {
  cpf: string;
  nome?: string | null;
  email?: string | null;
  origem: OrigemNumero;
  referencia: string;
  quantidade: number;
}): NumeroEmitido[] {
  const { cpf, nome, email, origem, referencia, quantidade } = params;

  const existente =
    participantes.get(cpf) ?? { cpf, nome: null, email: null, senhaHash: null, numeros: [] };
  const novos: NumeroEmitido[] = [];
  const emitidoEm = new Date().toISOString();

  for (let i = 0; i < quantidade; i++) {
    novos.push({
      numero: String(estado.proximoSequencial++).padStart(5, "0"),
      origem,
      referencia,
      emitidoEm,
    });
  }

  existente.nome = nome ?? existente.nome;
  existente.email = email ?? existente.email;
  existente.numeros.push(...novos);
  participantes.set(cpf, existente);
  referenciasProcessadas.add(chaveReferencia(origem, referencia));

  return novos;
}

/**
 * Participante de teste, só em `next dev`: já nasce com senha e números para
 * dar para entrar em /meus-numeros sem cadastrar nota antes. Como o store é
 * em memória, é recriado a cada reinício do servidor. Nunca roda em produção.
 *
 *   CPF:    529.982.247-25
 *   E-mail: teste@biscoite.com.br
 *   Senha:  teste123
 */
const CPF_TESTE = "52998224725";
if (process.env.NODE_ENV === "development" && !participantes.has(CPF_TESTE)) {
  registrarNumeros({
    cpf: CPF_TESTE,
    nome: "Participante Teste",
    email: "teste@biscoite.com.br",
    origem: "nota-fiscal",
    referencia: "seed-dev",
    quantidade: 3,
  });
  definirSenha(CPF_TESTE, hashSenha("teste123"));
}
