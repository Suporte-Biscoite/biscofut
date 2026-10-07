import { query } from "./db";
import { enviarEmail, urlDoSite } from "./email";
import { buscarPedidosDoCliente, skuParaProduto, skusAConfirmar, situacaoDoPedido, type ClienteLoja } from "./iota";

/**
 * Vigia e diagnóstico da integração com a IOTA/Nexaas.
 *
 * O vigia roda pelo cron da Vercel (vercel.json → /api/cron/monitor-iota) e
 * consulta a IOTA com um CPF de teste que tem uma compra de produto da
 * campanha já entregue (IOTA_CPF_TESTE). Se essa compra some — filtro da
 * campanha errado na IOTA, credencial vencida, IOTA ou Nexaas fora do ar —,
 * manda e-mail para ALERTA_EMAIL. Avisa de novo quando volta. Só manda
 * quando o estado muda, para não encher a caixa a cada 15 minutos.
 *
 * O CPF de teste não deve se cadastrar em /meus-numeros nem ter a compra
 * cancelada: é só a "compra de referência" do vigia.
 */

export type Diagnostico = {
  ok: boolean;
  /** Resumo em uma linha, para o e-mail e o admin. */
  resumo: string;
  /** O que provavelmente aconteceu e onde resolver. */
  explicacao: string;
  mensagemIota: string | null;
  pedidos: Array<{
    id: string;
    status: string | null;
    situacao: string;
    loja: string | null;
    criadoEm: string;
    itens: Array<{ sku: string; nome: string | null; quantidade: number; daCampanha: boolean; aConfirmar: boolean }>;
  }>;
};

/** Consulta a IOTA para um CPF e explica o resultado em português. */
export async function diagnosticarCpf(cpf: string): Promise<Diagnostico> {
  let cliente: ClienteLoja;
  try {
    cliente = await buscarPedidosDoCliente(cpf);
  } catch (erro) {
    return {
      ok: false,
      resumo: "A IOTA não respondeu.",
      explicacao: `${(erro as Error).message} Pode ser a IOTA ou a Nexaas fora do ar, rate limit da Nexaas ou chave/token inválidos (HTTP 401). Falar com o Jhone.`,
      mensagemIota: null,
      pedidos: [],
    };
  }

  const skus = skuParaProduto();
  const aConfirmar = skusAConfirmar();
  const pedidos = cliente.pedidos.map((p) => ({
    id: p.id,
    status: p.status,
    situacao: situacaoDoPedido(p.status),
    loja: p.loja,
    criadoEm: p.criadoEm,
    itens: p.itens.map((i) => ({ ...i, daCampanha: i.sku in skus, aConfirmar: aConfirmar.has(i.sku) })),
  }));
  const comCampanha = pedidos.filter((p) => p.itens.some((i) => i.daCampanha));

  if (comCampanha.length > 0) {
    return {
      ok: true,
      resumo: `${comCampanha.length} pedido(s) com produto da campanha.`,
      explicacao:
        "A IOTA está devolvendo as compras. Se os números não aparecem para o cliente, confira se ele já se cadastrou em Meus Números, se a compra é de 05/10 em diante, se o status já é \"delivered\" e se passaram 5 minutos desde a última consulta.",
      mensagemIota: cliente.mensagem,
      pedidos,
    };
  }

  const filtrouCampanha = /itens da campanha/i.test(cliente.mensagem ?? "");
  return {
    ok: false,
    resumo: filtrouCampanha
      ? "A IOTA acha o cliente, mas filtra os pedidos (nenhum com itens da campanha)."
      : "A IOTA não encontra nenhum pedido para este CPF.",
    explicacao: filtrouCampanha
      ? "O cliente tem pedidos na Nexaas, mas nenhum passou no filtro da campanha na IOTA. Causas comuns: a compra não tem nota fiscal autorizada (NFC-e com erro ou pendente — veja o rodapé do cupom); a compra não foi de Futi Card, Futi Player (Collection) ou Arena; ou o filtro da campanha NEYMARJR na IOTA precisa de ajuste (SKUs 4001292, 4001293, 4001261) — falar com o Jhone."
      : "Não há pedido vinculado a este CPF na Nexaas. Provável: o CPF entrou só como \"CPF na nota\" (sem identificar o cliente no PDV) ou foi digitado errado no caixa. Procurar a venda na Nexaas pela loja e horário.",
    mensagemIota: cliente.mensagem,
    pedidos,
  };
}

export type EstadoVigia = {
  ok: boolean;
  detalhe: string;
  verificadoEm: string;
  mudouEm: string;
  /** Se este resultado mudou o estado anterior (e por isso gerou e-mail). */
  mudou: boolean;
};

const CHAVE_VIGIA = "iota";

/** Roda o vigia: diagnostica o CPF de teste, grava o estado e avisa se mudou. */
export async function rodarVigia(): Promise<EstadoVigia> {
  const cpf = (process.env.IOTA_CPF_TESTE ?? "").replace(/\D/g, "");
  const diag: Diagnostico =
    cpf.length === 11
      ? await diagnosticarCpf(cpf)
      : {
          ok: false,
          resumo: "IOTA_CPF_TESTE não configurado.",
          explicacao: "Configure na Vercel o CPF de uma compra de teste de produto da campanha.",
          mensagemIota: null,
          pedidos: [],
        };
  const detalhe = `${diag.resumo} ${diag.explicacao}`;

  const [anterior] = await query<{ ok: boolean }>("SELECT ok FROM monitor WHERE chave = $1", [CHAVE_VIGIA]);
  const mudou = !anterior ? !diag.ok : anterior.ok !== diag.ok;

  const [linha] = await query<{ verificado_em: Date; mudou_em: Date }>(
    `INSERT INTO monitor (chave, ok, detalhe) VALUES ($1, $2, $3)
     ON CONFLICT (chave) DO UPDATE SET
       ok = EXCLUDED.ok, detalhe = EXCLUDED.detalhe, verificado_em = now(),
       mudou_em = CASE WHEN monitor.ok <> EXCLUDED.ok THEN now() ELSE monitor.mudou_em END
     RETURNING verificado_em, mudou_em`,
    [CHAVE_VIGIA, diag.ok, detalhe]
  );

  if (mudou) await avisar(diag);

  return {
    ok: diag.ok,
    detalhe,
    verificadoEm: linha.verificado_em.toISOString(),
    mudouEm: linha.mudou_em.toISOString(),
    mudou,
  };
}

export async function estadoDoVigia(): Promise<EstadoVigia | null> {
  const [linha] = await query<{ ok: boolean; detalhe: string; verificado_em: Date; mudou_em: Date }>(
    "SELECT ok, detalhe, verificado_em, mudou_em FROM monitor WHERE chave = $1",
    [CHAVE_VIGIA]
  );
  if (!linha) return null;
  return {
    ok: linha.ok,
    detalhe: linha.detalhe,
    verificadoEm: linha.verificado_em.toISOString(),
    mudouEm: linha.mudou_em.toISOString(),
    mudou: false,
  };
}

async function avisar(diag: Diagnostico): Promise<void> {
  const destinos = (process.env.ALERTA_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (destinos.length === 0) {
    console.warn("[vigia] ALERTA_EMAIL não configurado:", diag.resumo);
    return;
  }

  const assunto = diag.ok
    ? "✅ Promoção Futi: integração com a IOTA voltou a funcionar"
    : "🔴 Promoção Futi: compras não estão chegando da IOTA";
  const texto = `${diag.resumo}\n\n${diag.explicacao}\n\nResposta da IOTA: ${diag.mensagemIota ?? "—"}\n\nDiagnóstico completo: ${urlDoSite()}/admin (aba Diagnóstico)`;
  for (const para of destinos) {
    try {
      await enviarEmail({
        para,
        assunto,
        texto,
        html: texto
          .split("\n\n")
          .map((p) => `<p>${p.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}</p>`)
          .join(""),
      });
    } catch (erro) {
      console.error("[vigia] e-mail não enviado:", (erro as Error).message);
    }
  }
}
