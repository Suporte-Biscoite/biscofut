"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Reveal from "./Reveal";

/**
 * Seções extras da página do Futi Arena: a caixa com frente e verso (gira em
 * 3D ao passar o mouse ou tocar no botão) e o conteúdo do set.
 */

const CONTEUDO = [
  { qtd: "2", item: "bonequinhos" },
  { qtd: "2", item: "bolinhas" },
  { qtd: "1", item: "mini campo" },
  { qtd: "1", item: "kit de acessórios" },
] as const;

export default function ArenaShowcase() {
  const [verso, setVerso] = useState(false);

  return (
    <>
      <section className="mt-16 grid items-center gap-10 sm:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          {/* A flutuação fica num wrapper próprio: as duas animam `transform`
              e, no mesmo elemento, uma apagaria a outra. */}
          <div className="group animate-hover [perspective:1200px]">
            <div
              className={`relative mx-auto aspect-[300/232] w-full max-w-sm transition-transform duration-700 ease-out [transform-style:preserve-3d] ${
                verso ? "[transform:rotateY(180deg)]" : "sm:group-hover:[transform:rotateY(180deg)]"
              }`}
            >
              <img
                src="/images/produtos/futi-arena.webp"
                alt="Caixa do Futi Arena — frente"
                className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl [backface-visibility:hidden]"
              />
              <img
                src="/images/arena/web/caixa-verso.png"
                alt="Caixa do Futi Arena — verso, com o campo montado"
                className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]"
              />
            </div>
          </div>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setVerso((v) => !v)}
              aria-pressed={verso}
              className="btn-secondary px-5 py-2.5 text-[11px]"
            >
              {verso ? "↺ Ver a frente" : "↻ Ver o verso"}
            </button>
          </div>
        </Reveal>

        <div>
          <h2 className="text-xl font-black uppercase tracking-headline">O que vem no set</h2>
          <ul className="mt-6 space-y-3">
            {CONTEUDO.map((c, i) => (
              <li key={c.item}>
                <Reveal delay={i * 110}>
                  <div className="card flex items-center gap-4 px-5 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky text-lg font-black text-navy">
                      {c.qtd}
                    </span>
                    <span className="text-sm font-black uppercase tracking-label text-navy">
                      {c.item}
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
