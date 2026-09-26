/**
 * Lockup de co-branding: Biscoitê | NEYMAR JR.
 *
 * Biscoitê é a promotora e a marca principal — por decisão de negócio, o
 * logotipo dela vem primeiro e maior que os demais (futi, Neymar Jr.) em
 * todo lugar onde aparecem juntos. Isso substitui a decisão anterior de
 * peso visual equivalente entre Biscoitê e Neymar Jr.
 *
 * A "Biscoitê" já usa o PNG oficial, com variantes azul (fundo claro) e
 * branca (fundo escuro, via `tone="light"`). O "NEYMAR JR." continua
 * aproximação tipográfica — substituir por SVG oficial quando existir.
 */

import { tomDoLogo } from "@/lib/theme";

const BISCOITE_SRC = {
  navy: "/images/biscoite-azul.png",
  light: "/images/biscoite-branco.png",
} as const;

export default function BrandLockup({
  className = "",
  tone = "navy",
}: {
  className?: string;
  /** "navy" para fundo claro, "light" para fundo escuro. */
  tone?: "navy" | "light";
}) {
  const color = tone === "light" ? "text-white" : "text-navy";
  const rule = tone === "light" ? "bg-white/35" : "bg-navy/25";

  return (
    <div className={`flex items-center gap-4 ${color} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BISCOITE_SRC[tomDoLogo(tone)]}alt="Biscoitê" className="h-[1.65em] w-auto" />

      <span className={`h-[1.75em] w-px shrink-0 ${rule}`} aria-hidden="true" />

      <span className="flex items-center gap-2 leading-none">
        <NjMonogram className="h-[1.3em] w-auto" />
        <span className="text-[0.8em] font-black uppercase tracking-label">
          Neymar Jr.
        </span>
      </span>
    </div>
  );
}

/** Monograma NJ — traço contínuo, como no board. */
function NjMonogram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 52" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 46V10a4 4 0 0 1 7-2.6l14 20V6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M27 26v14a6 6 0 0 1-11 3.4"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
