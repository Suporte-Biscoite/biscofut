import { NextResponse } from "next/server";
import { campaign } from "@/lib/campaign";
import type { ResultadoSincronizacao } from "@/lib/sincronizacao";
import type { Participante } from "@/lib/store";

/** Resposta comum do login e do cadastro: os números do CPF. */
export function respostaComNumeros(participante: Participante, sincronizacao: ResultadoSincronizacao) {
  return NextResponse.json({
    ok: true,
    nome: participante.nome,
    acumulado: participante.numeros.length,
    limite: campaign.regras.maxNumerosPorCpf,
    numeros: participante.numeros.map((n) => ({ numero: n.numero, emitidoEm: n.emitidoEm })),
    // O front mostra um aviso quando as compras novas não puderam ser lidas.
    compras: sincronizacao.status,
  });
}
