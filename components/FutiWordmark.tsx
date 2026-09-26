/**
 * Logotipo oficial "futi" (PNG). Duas variantes prontas: azul (fundo claro)
 * e branca (fundo escuro, ex.: Footer.tsx) — sem herdar `currentColor`, como
 * o SVG placeholder herdava, então a variante certa precisa ser escolhida
 * via `tone`, não via classe de cor.
 */

import { tomDoLogo } from "@/lib/theme";

const SRC = {
  navy: "/images/futi-azul.png",
  light: "/images/futi-branco.png",
} as const;

export default function FutiWordmark({
  className = "",
  tone = "navy",
}: {
  className?: string;
  /** "navy" para fundo claro, "light" para fundo escuro. */
  tone?: "navy" | "light";
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SRC[tomDoLogo(tone)]} alt="futi" className={className} />;
}
