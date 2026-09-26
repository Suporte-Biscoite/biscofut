/* eslint-disable @next/next/no-img-element */

/**
 * Figurinha decorativa do Neymar (ilustração), espalhada pela home.
 *
 * Posicionada em absoluto — o pai precisa ser `relative`. Só aparece a partir
 * de `lg`: em telas menores não há margem livre e ela cobriria o texto.
 * A rotação fica no wrapper e a flutuação na imagem, porque as duas animam
 * `transform` e, no mesmo elemento, uma apagaria a outra.
 */
export default function Sticker({
  src,
  className = "",
  rotate = 0,
  delay = 0,
}: {
  src: string;
  /** Posição e largura, ex.: "-left-10 bottom-4 w-40". */
  className?: string;
  /** Inclinação em graus. */
  rotate?: number;
  /** Atraso da flutuação em ms — para as figurinhas não subirem juntas. */
  delay?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 hidden select-none lg:block ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <img
        src={src}
        alt=""
        className="h-auto w-full animate-hover drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)]"
        style={{ animationDelay: `${delay}ms` }}
      />
    </div>
  );
}
