"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

export type Boneco = {
  arquivo: string;
  nome: string;
  /** Render do card na grade (PNG/WebP com fundo transparente). */
  foto: string;
  /** Imagem ampliada ao clicar: a arte em alta (SVG/PNG) ou, sem ela, a foto. */
  detalhe: string;
};

/**
 * Grade dos 6 bonequinhos. Clicar num deles abre a imagem ampliada num
 * <dialog> nativo (Esc fecha, o foco volta para o card), com ← → para passar
 * de um bonequinho para o outro.
 */
export default function BonecosGaleria({ bonecos }: { bonecos: Boneco[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState<number | null>(null);

  const abrir = (i: number) => {
    setAberto(i);
    dialogRef.current?.showModal();
  };
  const fechar = () => dialogRef.current?.close();
  const passar = useCallback(
    (passo: number) =>
      setAberto((i) => (i === null ? i : (i + passo + bonecos.length) % bonecos.length)),
    [bonecos.length],
  );

  useEffect(() => {
    if (aberto === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") passar(1);
      if (e.key === "ArrowLeft") passar(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, passar]);

  const atual = aberto === null ? null : bonecos[aberto];

  return (
    <>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
        {bonecos.map((boneco, i) => (
          <li key={boneco.arquivo}>
            <Reveal delay={i * 90}>
              <button
                type="button"
                onClick={() => abrir(i)}
                aria-label={`Ampliar o bonequinho ${boneco.nome}`}
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-white text-left shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
              >
                <img
                  src={boneco.foto}
                  alt={`Bonequinho Futi ${boneco.nome}`}
                  width={640}
                  height={700}
                  loading="lazy"
                  // Pés alinhados na base: os renders têm a mesma largura, e o
                  // que muda de um para outro é a altura do cabelo.
                  className="aspect-[4/5] w-full object-contain object-bottom px-5 pb-12 pt-6 transition-transform duration-500 group-hover:scale-110"
                />
                {boneco.arquivo === "dourado" && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine"
                    // Branco literal: no tema futi, a classe `white` é azul.
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-paper/90 to-transparent px-4 pb-3 pt-8 text-xs font-black uppercase tracking-label text-navy">
                  {boneco.nome}
                  <span aria-hidden="true" className="opacity-0 transition-opacity group-hover:opacity-100">
                    ⤢
                  </span>
                </span>
              </button>
            </Reveal>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setAberto(null)}
        // Clique fora da imagem (no fundo escuro) fecha.
        onClick={(e) => e.target === e.currentTarget && fechar()}
        aria-label={atual ? `Bonequinho ${atual.nome}` : undefined}
        className="m-auto max-h-[92vh] w-[min(92vw,44rem)] overflow-visible bg-transparent p-0 backdrop:bg-[#081226]/85 backdrop:backdrop-blur-sm"
      >
        {atual && (
          <figure className="relative">
            <div className="flex items-center justify-center rounded-3xl bg-white p-4 shadow-2xl sm:p-8">
              <img
                key={atual.detalhe}
                src={atual.detalhe}
                alt={`Bonequinho Futi ${atual.nome}, ampliado`}
                className="max-h-[72vh] w-auto max-w-full animate-floatUp object-contain"
              />
            </div>
            <figcaption className="mt-4 flex items-center justify-between gap-4 text-[#FFFFFF]">
              <button
                type="button"
                onClick={() => passar(-1)}
                aria-label="Bonequinho anterior"
                className="rounded-full border border-[#FFFFFF]/35 px-4 py-2 text-sm font-black transition-colors hover:bg-[#FFFFFF]/10"
              >
                ←
              </button>
              <span className="text-sm font-black uppercase tracking-label">
                {atual.nome}{" "}
                <span className="font-medium text-[#FFFFFF]/60">
                  {aberto! + 1}/{bonecos.length}
                </span>
              </span>
              <button
                type="button"
                onClick={() => passar(1)}
                aria-label="Próximo bonequinho"
                className="rounded-full border border-[#FFFFFF]/35 px-4 py-2 text-sm font-black transition-colors hover:bg-[#FFFFFF]/10"
              >
                →
              </button>
            </figcaption>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#081226] text-lg font-black text-[#FFFFFF] shadow-lg ring-2 ring-[#FFFFFF]/80 transition-transform hover:scale-110"
            >
              ×
            </button>
          </figure>
        )}
      </dialog>
    </>
  );
}
