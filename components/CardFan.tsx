"use client";

import { useEffect, useRef, useState } from "react";
import type { Carta, RaridadeCarta } from "@/lib/futiCards";

/**
 * Visualizador das cartas do Futi Card — dois modos, conforme o tamanho da
 * tela:
 *
 * - Desktop/tablet (sm e acima): leque. Todas as cartas ficam empilhadas e
 *   levemente rotacionadas, como um baralho aberto na mão — a carta ativa
 *   fica centralizada e por cima; as vizinhas se abrem em leque para os dois
 *   lados.
 * - Celular (abaixo de sm): carrossel de deslizar. Um leque de 23 cartas não
 *   cabe numa tela estreita, então aqui é um carrossel horizontal com
 *   scroll-snap nativo — arrastar o dedo já troca de carta, sem precisar de
 *   lógica de gesto em JS.
 *
 * Os dois modos compartilham o mesmo estado (`indice`) e os mesmos botões de
 * navegação/contador/atributos abaixo.
 *
 * Se a arte de alguma carta futura ainda não tiver chegado (ver
 * `pendente` em lib/futiCards.ts), ou se a imagem falhar ao carregar, cai
 * automaticamente num placeholder com nome e raridade da carta — a página
 * não fica com ícone de imagem quebrada.
 */

const RARIDADE_LABEL: Record<RaridadeCarta, string> = {
  normal: "Normal",
  premium: "Premium",
  golden: "Golden",
};

const RARIDADE_STYLE: Record<RaridadeCarta, string> = {
  normal: "bg-steel/15 text-steel",
  premium: "bg-navy/10 text-navy",
  golden: "bg-gold/20 text-gold",
};

export default function CardFan({ cartas }: { cartas: Carta[] }) {
  const [indice, setIndice] = useState(0);
  const [quebradas, setQuebradas] = useState<Set<number>>(new Set());
  const trilhoRef = useRef<HTMLDivElement>(null);
  const ignorarProximoScroll = useRef(false);

  const total = cartas.length;

  function irPara(novoIndice: number) {
    setIndice(novoIndice);

    const trilho = trilhoRef.current;
    if (trilho) {
      ignorarProximoScroll.current = true;
      trilho.scrollTo({ left: novoIndice * trilho.clientWidth, behavior: "smooth" });
    }
  }

  const anterior = () => irPara((indice - 1 + total) % total);
  const proxima = () => irPara((indice + 1) % total);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [indice, total]);

  // No carrossel mobile, o próprio scroll (arrastar o dedo) já troca de
  // carta — aqui só sincronizamos o `indice` com o que a pessoa parou de ver.
  function onScrollTrilho() {
    if (ignorarProximoScroll.current) {
      ignorarProximoScroll.current = false;
      return;
    }
    const trilho = trilhoRef.current;
    if (!trilho || trilho.clientWidth === 0) return;
    const novoIndice = Math.round(trilho.scrollLeft / trilho.clientWidth);
    if (novoIndice !== indice) setIndice(novoIndice);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Celular: carrossel de deslizar (scroll-snap nativo). */}
      <div
        ref={trilhoRef}
        onScroll={onScrollTrilho}
        className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:hidden"
        role="group"
        aria-label={`Carta ${indice + 1} de ${total}: ${cartas[indice].nome}`}
      >
        {cartas.map((carta) => (
          <div key={carta.numero} className="w-full shrink-0 snap-center">
            <div className="mx-auto h-72 w-48 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
              <CartaConteudo
                carta={carta}
                total={total}
                quebrada={quebradas.has(carta.numero)}
                onErro={() => setQuebradas((prev) => new Set(prev).add(carta.numero))}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet: leque. */}
      <div
        className="relative hidden h-[26rem] w-full max-w-xl select-none sm:block"
        role="group"
        aria-label={`Carta ${indice + 1} de ${total}: ${cartas[indice].nome}`}
      >
        {cartas.map((carta, i) => {
          const offset = deslocamentoCircular(i, indice, total);
          const ativa = offset === 0;
          const visivel = Math.abs(offset) <= 4;

          return (
            <div
              key={carta.numero}
              className="absolute left-1/2 top-1/2 h-80 w-56 origin-bottom transition-all duration-300 ease-out"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 52}px) translateY(${Math.abs(offset) * 14}px) rotate(${offset * 7}deg) scale(${1 - Math.abs(offset) * 0.07})`,
                zIndex: 100 - Math.abs(offset),
                opacity: visivel ? 1 : 0,
                pointerEvents: ativa ? "auto" : "none",
              }}
              aria-hidden={!ativa}
            >
              <div
                className={`h-full w-full overflow-hidden rounded-2xl border bg-white shadow-lg ${
                  ativa ? "border-navy/30 shadow-navy/20" : "border-line"
                }`}
              >
                {visivel && (
                  <CartaConteudo
                    carta={carta}
                    total={total}
                    quebrada={quebradas.has(carta.numero)}
                    onErro={() => setQuebradas((prev) => new Set(prev).add(carta.numero))}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-5">
        <button
          type="button"
          onClick={anterior}
          aria-label="Carta anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-navy transition-colors hover:border-navy"
        >
          ←
        </button>
        <p className="text-sm font-black uppercase tracking-label text-steel">
          Carta {indice + 1} <span className="text-ink/30">/</span> {total}
        </p>
        <button
          type="button"
          onClick={proxima}
          aria-label="Próxima carta"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-navy transition-colors hover:border-navy"
        >
          →
        </button>
      </div>

      <p className="mt-3 text-sm font-black uppercase tracking-label text-navy">
        {cartas[indice].nome}{" "}
        <span
          className={`ml-2 rounded-full px-2.5 py-1 text-[10px] ${RARIDADE_STYLE[cartas[indice].raridade]}`}
        >
          {RARIDADE_LABEL[cartas[indice].raridade]}
        </span>
      </p>

      {cartas[indice].atributos && (
        <dl className="mt-5 grid grid-cols-4 gap-3 text-center">
          <Atributo label="Velocidade" valor={cartas[indice].atributos!.velocidade} />
          <Atributo label="Chute" valor={cartas[indice].atributos!.chute} />
          <Atributo label="Habilidade" valor={cartas[indice].atributos!.habilidade} />
          <Atributo label="Energia" valor={cartas[indice].atributos!.energia} />
        </dl>
      )}
    </div>
  );
}

function CartaConteudo({
  carta,
  total,
  quebrada,
  onErro,
}: {
  carta: Carta;
  total: number;
  quebrada: boolean;
  onErro: () => void;
}) {
  if (carta.pendente || quebrada) return <CartaPlaceholder carta={carta} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={carta.imagem}
      alt={`${carta.nome} — carta ${carta.numero} de ${total}`}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={onErro}
    />
  );
}

function Atributo({ label, valor }: { label: string; valor: number }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-label text-steel">{label}</dt>
      <dd className="mt-1 text-lg font-black text-navy">{valor}</dd>
    </div>
  );
}

/** Menor caminho circular entre duas posições, com sinal (esquerda/direita). */
function deslocamentoCircular(i: number, indice: number, total: number): number {
  let d = i - indice;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

function CartaPlaceholder({ carta }: { carta: Carta }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-paper px-4 text-center">
      <span className="text-4xl font-black text-navy/25">{carta.numero}</span>
      <span className="text-sm font-black uppercase tracking-headline text-navy/60">
        {carta.nome}
      </span>
      <span className="text-[11px] font-black uppercase tracking-label text-steel">
        Arte em produção
      </span>
    </div>
  );
}
