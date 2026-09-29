/**
 * Lockup de co-branding: Biscoitê | NEYMAR JR.
 *
 * Biscoitê é a promotora e a marca principal — por decisão de negócio, o
 * logotipo dela vem primeiro e maior que os demais (futi, Neymar Jr.) em
 * todo lugar onde aparecem juntos. Isso substitui a decisão anterior de
 * peso visual equivalente entre Biscoitê e Neymar Jr.
 *
 * A "Biscoitê" usa o PNG oficial, com variantes azul (fundo claro) e branca
 * (fundo escuro, via `tone="light"`). O "NEYMAR JR." usa o logo oficial
 * (public/logoneymar.png, branco sobre transparente) como máscara CSS: o
 * desenho vem do arquivo e a cor vem de `currentColor`, então o mesmo PNG
 * serve para fundo claro e escuro, nos dois temas.
 */

import { tomDoLogo } from "@/lib/theme";

const BISCOITE_SRC = {
  navy: "/images/biscoite-azul.png",
  light: "/images/biscoite-branco.png",
} as const;

const NEYMAR_MASK = {
  WebkitMaskImage: "url(/logoneymar.png)",
  maskImage: "url(/logoneymar.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
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
      <img src={BISCOITE_SRC[tomDoLogo(tone)]} alt="Biscoitê" className="h-[1.65em] w-auto" />

      <span className={`h-[1.75em] w-px shrink-0 ${rule}`} aria-hidden="true" />

      {/* Proporção do PNG oficial: 688 × 226. */}
      <span
        role="img"
        aria-label="Neymar Jr."
        className="block aspect-[688/226] h-[1.6em] shrink-0 bg-current"
        style={NEYMAR_MASK}
      />
    </div>
  );
}
