/**
 * Fonte única de verdade dos dados da campanha.
 *
 * Tudo que o jurídico precisa preencher antes do protocolo na SPA/MF está
 * aqui — e só aqui. Nenhum texto de prêmio, data, limite ou número de
 * certificado deve ser escrito direto num componente: se estiver em dois
 * lugares, um dia os dois vão divergir, e divergência entre a LP e o
 * regulamento protocolado é problema de conformidade, não de código.
 *
 * Campos marcados com PENDENTE renderizam um placeholder visível na tela,
 * de propósito: é melhor a página gritar "falta preencher" do que publicar
 * uma data inventada.
 */

export const PENDENTE = "[A CONFIRMAR]" as const;

export const campaign = {
  nome: "Missão Neymar Jr.",
  marcas: {
    promotora: "Biscoitê",
    embaixador: "Neymar Jr.",
  },

  /** Identificação legal da promotora, conforme consta no regulamento protocolado. */
  promotora: {
    razaoSocial: "Biscoite Ltda.",
    cnpj: "35.689.008/0001-91",
    endereco:
      "Rua São Sebastião, nº 823, Santo Amaro, São Paulo/SP – CEP 04708-001",
    representante: {
      nome: "Raul Alves de Matos",
      nacionalidade: "brasileiro",
      estadoCivil: "casado",
      rg: "33.806.841-7",
      cpf: "284.927.398",
    },
  },

  /** Certificado de Autorização emitido pela SPA/MF. */
  certificado: {
    /** Preencher com o nº do CA assim que emitido. Ex.: "04.123456/2026". */
    numero: "2026/06438" as string | null,
    /** URL do PDF do CA hospedado. Obrigatório exibir na LP após a emissão. */
    pdf: null as string | null,
  },

  /**
   * Vigência da participação. Formato ISO (AAAA-MM-DD) ou null.
   * O período de divulgação da campanha é o mesmo período de participação
   * (assim consta no regulamento) — não é um valor separado.
   */
  vigencia: {
    inicio: "2026-10-01" as string | null,
    fim: "2027-09-28" as string | null,
  },

  /**
   * Apuração mensal, na última quarta-feira de cada mês — exceto dezembro,
   * antecipada para 23/12. Uma data por sorteio, 11 sorteios ao todo.
   */
  apuracao: {
    datas: [
      "2026-11-25",
      "2026-12-23",
      "2027-01-27",
      "2027-02-24",
      "2027-03-31",
      "2027-04-28",
      "2027-05-26",
      "2027-06-30",
      "2027-07-28",
      "2027-08-25",
      "2027-09-29",
    ] as string[],
    /** Extração da Loteria Federal usada como base do sorteio. */
    baseLoteriaFederal: true,
    /** Ganhadores contemplados a cada sorteio mensal. */
    ganhadoresPorSorteio: 2,
  },

  premios: {
    /** Prêmio principal, já definido no briefing. */
    itensAutografados: {
      quantidade: 22,
      descricao: "camiseta do Brasil oficial autografada pelo Neymar Jr.",
      /** Valor unitário declarado no protocolo. */
      valorUnitario: 400 as number | null,
    },
    /**
     * O briefing trata o encontro como "possível". Enquanto não estiver no
     * CA, ele NÃO pode ser anunciado como prêmio — a LP mostra como
     * "em estudo", sem promessa. Virar `true` só depois da autorização.
     */
    encontro: {
      confirmado: false,
      descricao: "encontro com o Neymar Jr.",
    },
  },

  regras: {
    idadeMinima: 18,
    /** Teto de números da sorte por CPF em toda a campanha. */
    maxNumerosPorCpf: 200,
  },

  documentos: {
    regulamento: "/regulamento",
    privacidade: "/politica-de-privacidade",
    termos: "/termos-de-uso",
    meusNumeros: "/meus-numeros",
  },

  contato: {
    email: "promocaofuti@biscoite.com.br",
    /** Canal de atendimento ao consumidor exigido no regulamento. */
    sacTelefone: PENDENTE,
  },

  legal: {
    lei: "Lei nº 5.768/1971",
    decreto: "Decreto nº 70.951/1972",
    orgao: "Secretaria de Prêmios e Apostas (SPA/MF)",
  },
} as const;

/** Formata uma data ISO para pt-BR, ou devolve o placeholder. */
export function formatDate(iso: string | null): string {
  if (!iso) return PENDENTE;
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Texto do rodapé legal, montado a partir do que já está preenchido. */
export function legalFooterText(): string {
  const ca = campaign.certificado.numero
    ? `Certificado de Autorização SPA/MF nº ${campaign.certificado.numero}.`
    : "Certificado de Autorização SPA/MF: aguardando emissão.";

  return `${ca} Promoção comercial regida pela ${campaign.legal.lei} e pelo ${campaign.legal.decreto}, sob regulação da ${campaign.legal.orgao}. Participação exclusiva para pessoas físicas maiores de ${campaign.regras.idadeMinima} anos residentes no Brasil, mediante compra de produtos participantes. Imagens meramente ilustrativas.`;
}
